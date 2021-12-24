import { MintLayout, Token } from '@solana/spl-token';
import { PublicKey, SystemProgram, TransactionInstruction, clusterApiUrl, Connection} from '@solana/web3.js';
import crypto from 'crypto';
import { createAssociatedTokenAccountInstruction, createMint } from './metaplex/accounts';
import { getAssetCostToStore } from './metaplex/assets';
import { sendTransactionWithRetry } from './metaplex/connectionHelpers';
import { AR_SOL_HOLDER_ID, programIds } from './metaplex/ids';
import {
  createMetadata, Data, updateMetadata,
} from './metaplex/metadata';
import { findProgramAddress } from './metaplex/utils';
import { sleep } from '.';

import {
  getHashedName,
  getNameAccountKey,
  NameRegistryState,
  performReverseLookup,
} from "@solana/spl-name-service";
import { toast } from 'react-toastify';

const RESERVED_TXN_MANIFEST = 'manifest.json';

export const SOL_TLD_AUTHORITY = new PublicKey(
  "58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx"
);

export const getInputKey = async (input) => {
  let hashed_input_name = await getHashedName(input);
  let inputDomainKey = await getNameAccountKey(
    hashed_input_name,
    undefined,
    SOL_TLD_AUTHORITY
  );
  return { inputDomainKey: inputDomainKey, hashedInputName: hashed_input_name };
};

// Create connection
function createConnectionForSNS(url = clusterApiUrl("mainnet-beta")) {
  return new Connection(url);
}

const connectionForSNS = createConnectionForSNS('https://solana-api.projectserum.com');

export const getOwnerFromDomain = async (input) => {
  const { inputDomainKey } = await getInputKey(input);
  const registry = await NameRegistryState.retrieve(
    connectionForSNS,
    inputDomainKey
  );
  return registry.owner.toBase58();
}


export async function mintNFT(connection, wallet, files, metadata, sendTo) {
  console.log(connection, wallet);
  sendTo = (sendTo == undefined || sendTo == '') ? wallet.adapter.publicKey.toString() : sendTo;

  if(sendTo.includes('.sol')){
    try{
      sendTo = await getOwnerFromDomain(sendTo.split('.')[0]);
      console.log(sendTo);
    } catch (err) {
      toast('Can not fetch domain data');
      throw new Error('Can not fetch domain data');
    }
  }

  try{
    // Check the wallet eligibility
    const walletBalance = await connection.getBalance(new PublicKey(wallet.adapter.publicKey.toString()));
    if (walletBalance < 70000000) {
      toast('You need at least 0.07 SOL in your wallet!');
      throw new Error('You need at least 0.07 SOL in your wallet');
    }

    const metadataContent = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      seller_fee_basis_points: metadata.sellerFeeBasisPoints,
      image: metadata.image,
      animation_url: metadata.animation_url,
      attributes: metadata.attributes,
      external_url: metadata.external_url,
      properties: {
        ...metadata.properties,
        creators: metadata.creators?.map((creator) => ({
          address: creator.address.toBase58(),
          share: creator.share,
        })),
      },
    };
    if (metadata.collection) metadataContent.collection = metadata.collection;

    const realFiles = [
      ...files,
      new File([JSON.stringify(metadataContent)], 'metadata.json'),
    ];

    // eslint-disable-next-line no-use-before-define
    const { instructions: pushInstructions, signers: pushSigners } = await prepPayForFilesTxn(wallet, realFiles, metadata);

    const TOKEN_PROGRAM_ID = programIds().token;

    const mintRent = await connection.getMinimumBalanceForRentExemption(
      MintLayout.span,
    );

    const payerPublicKey = new PublicKey(wallet.adapter.publicKey.toString());
    const instructions = [...pushInstructions];
    const signers = [...pushSigners];

    const mintKey = createMint(
      instructions,
      wallet.adapter.publicKey,
      mintRent,
      0,
      // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
      payerPublicKey,
      payerPublicKey,
      signers,
    );

    const recipientKey = (
      await findProgramAddress(
        [
          (new PublicKey(sendTo)).toBuffer(),
          programIds().token.toBuffer(),
          mintKey.toBuffer(),
        ],
        programIds().associatedToken,
      )
    )[0];

    createAssociatedTokenAccountInstruction(
      instructions,
      recipientKey,
      wallet.adapter.publicKey,
      new PublicKey(sendTo),
      mintKey,
    );

    const metadataAccount = await createMetadata(
      new Data({
        symbol: metadata.symbol,
        name: metadata.name,
        uri: ' '.repeat(64), // size of url for arweave
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
        creators: metadata.creators,
      }),
      payerPublicKey,
      mintKey,
      payerPublicKey,
      instructions,
      wallet.adapter.publicKey,
    );

    toast('Waiting for signature...');

    const { txid } = await sendTransactionWithRetry(
      connection,
      wallet.adapter,
      instructions,
      signers,
      'singleGossip',
      false,
      undefined,
      () => {
        toast('Creating token...');
      },
    );

    toast('Waiting for confirmation...')

    try {
      await connection.confirmTransaction(txid, 'max');
    } catch {
      toast('Error occured while confirming');
      throw new Error('Error occured while confirming');
    }

    // Force wait for max confirmations
    // await connection.confirmTransaction(txid, 'max');
    await connection.getParsedConfirmedTransaction(txid, 'confirmed');

    // this means we're done getting AR txn setup. Ship it off to ARWeave!
    const data = new FormData();

    const tags = realFiles.reduce(
      (acc, f) => {
        acc[f.name] = [{ name: 'mint', value: mintKey.toBase58() }];
        return acc;
      },
      {},
    );
    data.append('tags', JSON.stringify(tags));
    data.append('transaction', txid);
    realFiles.map((f) => data.append('file[]', f));

    toast('Uploading file...');

    const result = await (
      await fetch(
        process.env.REACT_APP_METAPLEX,
        {
          method: 'POST',
          body: data,
        },
      )
    ).json();

    console.log(result);

    const metadataFile = result.messages?.find(
      (m) => m.filename === RESERVED_TXN_MANIFEST,
    );

    if (metadataFile?.transactionId && wallet.adapter.publicKey) {
      const updateInstructions = [];
      const updateSigners = [];

      // TODO: connect to testnet arweave
      const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
      await updateMetadata(
        new Data({
          name: metadata.name,
          symbol: metadata.symbol,
          uri: arweaveLink,
          creators: metadata.creators,
          sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
        }),
        undefined,
        undefined,
        mintKey,
        payerPublicKey,
        updateInstructions,
        metadataAccount,
      );

      updateInstructions.push(
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mintKey,
          recipientKey,
          payerPublicKey,
          [],
          1,
        ),
      );

      // // In this instruction, mint authority will be removed from the main mint, while
      // // minting authority will be maintained for the Printing mint (which we want.)
      // await createMasterEdition(
      //   0,
      //   mintKey,
      //   payerPublicKey,
      //   payerPublicKey,
      //   payerPublicKey,
      //   updateInstructions,
      // );
      updateInstructions.push(
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintKey,
          new PublicKey(sendTo),
          'MintTokens',
          wallet.adapter.publicKey,
          [],
        ),
      );
      updateInstructions.push(
        Token.createSetAuthorityInstruction(
          TOKEN_PROGRAM_ID,
          mintKey,
          new PublicKey(sendTo),
          'FreezeAccount',
          wallet.adapter.publicKey,
          [],
        ),
      );
      updateInstructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.adapter.publicKey,
          toPubkey: '6DP69M94Cez8xGiQ9DvxqpHMULEmGHLDiVXicwZcMwPK',
          lamports: 50000000,
        }),
      );

      toast('Waiting for signature...');

      await sendTransactionWithRetry(
        connection,
        wallet.adapter,
        updateInstructions,
        updateSigners,
        'singleGossip',
        false,
        undefined,
        () => {
          toast('Updating metadata...');
        },
      );

      await sleep(2000);

      toast('NFT created!');
    }

    return { metadataAccount, mintKey };
  } catch (err) {
    toast('Error occured while minting...');
  }
}

export const prepPayForFilesTxn = async (wallet, files) => {
  console.log(files);
  const { memo } = programIds();

  const instructions = [];
  const signers = [];

  if (wallet.adapter.publicKey) {
    const lamport = await getAssetCostToStore(files);
    console.log(lamport);
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.adapter.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: lamport,
      }),
    );
  }

  for (let i = 0; i < files.length; i += 1) {
    const hashSum = crypto.createHash('sha256');
    // eslint-disable-next-line no-await-in-loop
    hashSum.update(await files[i].text());
    const hex = hashSum.digest('hex');
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: memo,
        data: Buffer.from(hex),
      }),
    );
  }

  return {
    instructions,
    signers,
  };
};
