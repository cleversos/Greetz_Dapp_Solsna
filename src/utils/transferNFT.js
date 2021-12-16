import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { PublicKey, Transaction } from '@solana/web3.js';
import Vue from 'vue';
import { createAssociatedTokenAccountInstruction} from './metaplex/accounts';

export default async function transferNFT(connection, wallet, minted_id, destination) {
  if (wallet) {
    console.log(`--> Transfer ${minted_id.toString()}\
     from ${wallet.publicKey.toString()} to ${destination}`);

    const sourcePubkey = await getTokenWallet(wallet.publicKey, minted_id);
    const destinationPubkey = await getTokenWallet(new PublicKey(destination), minted_id);

    let instructions = [];
    const createATAIx = createAssociatedTokenAccountInstruction(
      instructions,
      destinationPubkey,
      wallet.publicKey,
      new PublicKey(destination),
      minted_id,
    );

    const transferIx = Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      sourcePubkey,
      destinationPubkey,
      wallet.publicKey,
      [],
      1
    );

    instructions.push(transferIx);
    let tx = new Transaction().add(...instructions);
    tx.setSigners(
      ...([wallet.publicKey]),
    );
    tx.recentBlockhash = (await connection.getRecentBlockhash("max")).blockhash;
    let signed = await wallet.signTransaction(tx);
    let txid = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'singleGossip'
    });
    const transferTxId = await connection.confirmTransaction(txid, 'singleGossip');

    if(transferTxId == null){
      return false;
    }
    Vue.toasted.show('NFT Transferred', {
      icon: 'timer-sand',
      iconPack: 'mdi',
    });

    return true;
  }
  return false;
};

export const getTokenWallet = async ( wallet, mint) => {
  return (
    await PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey( "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" ) )
  )[0];
};

