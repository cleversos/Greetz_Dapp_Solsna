import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from 'ethers'
import 'rc-color-picker/assets/index.css';
import ColorPicker from 'rc-color-picker';
import Picker from 'emoji-picker-react';
import './App.scss';
import $ from 'jquery';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import Modal from './components/Modal'
import html2canvas from 'html2canvas'
import Toggle from 'react-toggle'
import "react-toggle/style.css"
import "./custom.css"

/* ES6 */
import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';
import AWS from 'aws-sdk';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Keypair, SystemProgram, Transaction } from '@solana/web3.js';

import { mintNFT } from './utils/mintNFT';
import { Creator, extendBorsh } from './utils/metaplex/metadata';
import { PublicKey } from '@solana/web3.js';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import myEpicNft from './utils/MyEpicNFT.json'

import { create as ipfsHttpClient } from 'ipfs-http-client';
import ENS from 'ethereum-ens';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

const CONTRACT_ADDRESS = "0xFeCDAd6280E1383e09e7E08313305e56a9488671";

const InfoMsg = ({ toastProps }) => (
  <p>
    <b>2 Approvals</b> are needed to mint & send - please wait on this page for 30 seconds.
  </p>
)

const EthereumIcon = () => (
  <img className='ethereum-icon' src='./ethereum.png'/>
)

const SolanaIcon = () => (
  <img className='solana-icon' src='./solana.png'/>
)

function App() {
  const [currentAccount, setCurrentAccount] = useState("")
  const { connection } = useConnection();
  const { publicKey, wallet} = useWallet();
  //network selection
  const [isEthereum, setIsEthereum] = useState(false);
  
  //ethereum info
  const [ethereumWalletAccount, setEthereumWalletAccount] = useState(null);

  //color
  const [bgColor, setBgColor] = useState("#fff")
  const [textColor, setTextColor] = useState("#000")
  //font name
  const [fontName, setFontName] = useState("'Roboto', sans-serif");
  const [fontSize, setFontSize] = useState("14px");
  //content
  const [content, setContent] = useState();
  const [recipient, setRecipient] = useState();
  // Emoji
  const [chosenEmoji, setChosenEmoji] = useState(null);
  const [isEmojiActive, setIsEmojiActive] = useState(false);
  const [cursorPos, setCursorPos] = useState(null);
  // images frame array
  const [frameArray, setFrameArray] = useState([]);
  const [miningAnimation, setMiningAnimation] = useState(false)

  const connectWallet = async () => {
    try {
      if(ethereumWalletAccount != null){
        setEthereumWalletAccount(null);
        return;
      }

      const { ethereum } = window;

      if (!ethereum) {
        setEthereumWalletAccount(null);
        alert("Get Metamask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0])
      setCurrentAccount(accounts[0])
      setupEventListener()
    } catch (error) {
      console.log(error)
    }
  }

  const setupEventListener = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        setEthereumWalletAccount(provider.provider.selectedAddress);
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        connectedContract.on("NewNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber())
        })
        console.log("Setup event listener!")
      } else {
        console.log("Ethereum object doesn't exist")
        setEthereumWalletAccount(null);
      }
    } catch (error) {
      console.log(error)
      setEthereumWalletAccount(null);
    }
  }

  const askContractToMintNft = async (receiver, metadataUrl) => {
      try {
        const { ethereum } = window;

        if (ethereum) {
          const provider = new ethers.providers.Web3Provider(ethereum);
          if(receiver == ''){
            receiver = ethereumWalletAccount;
          }
          const signer = provider.getSigner()
          const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer)

          // console.log("Going to pop wallet now to pay gas...")
          let nftTxn = await connectedContract.mint(metadataUrl, receiver, {value: ethers.utils.parseUnits('0.0025', 18)});

          // console.log("Mining... please wait")
          await nftTxn.wait()
          console.log(nftTxn)
          console.log(`Mined, tee transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`)
        } else {
          console.log("Ethereum object doesn't exist")
        }
      } catch (error) {
        console.log(error)
        toast(error.message);
        setMiningAnimation(false);
      }
  }

  const renderConnectButton = () => (
    <button onClick={connectWallet} className="ethereum-adapter-button ethereum-adapter-button-trigger">
      { ethereumWalletAccount == null ? 'Select Wallet' : ethereumWalletAccount.toString().substring(0,10) + '...'}
    </button>
  );
  
  const renderMintUI = () => (
    <button onClick={askContractToMintNft} className="mint-button">
      Mint NFT
    </button>
  )
  
  //image toggle
  const emojiShowToggle = () => {
    setIsEmojiActive(!isEmojiActive)
  }
  // when image choose - 
  const onEmojiClick = (event, emojiObject) => {
    setChosenEmoji(emojiObject);

    let mousePointer;
    mousePointer = $('textarea').prop('selectionStart');
    let v = $('textarea').val();
    let textBefore = v.substring(0, mousePointer);
    let textAfter = v.substring(mousePointer, v.length);
    $('textarea').focus().val(textBefore + emojiObject.emoji + textAfter);
    //$('.frame-content').html($('textarea').val());
    let elmTextarea = document.querySelector('textarea');
    contentChange(elmTextarea);
    if (mousePointer < v.length) {
      $('textarea').selectRange(mousePointer + 2);
    }
  };

  $.fn.selectRange = function (start, end) {
    if (typeof end === 'undefined') {
      end = start;
    }
    return this.each(function () {
      if ('selectionStart' in this) {
        this.selectionStart = start;
        this.selectionEnd = end;
      } else if (this.setSelectionRange) {
        this.setSelectionRange(start, end);
      } else if (this.createTextRange) {
        var range = this.createTextRange();
        range.collapse(true);
        range.moveEnd('character', end);
        range.moveStart('character', start);
        range.select();
      }
    });
  };

  const fontNameUpdate = (event) => {
    setFontName(event.target.value);
  }
  const fontSizeUpdate = (event) => {
    setFontSize(event.target.value);
  }

  const bgColorUpdate = (color) => {
    let rgba = hexToRGB(color.color, color.alpha)
    setBgColor(rgba)
  }
  const textColorUpdate = (color) => {
    let rgba = hexToRGB(color.color, color.alpha)
    setTextColor(rgba)
  }

  function hexToRGB(hex, alphaParam) {
    let alpha = alphaParam / 100;
    var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  const contentChange = (target) => {
    //let content = target.value.replace(/\r\n|\r|\n/g, "<br />")
    $('.frame-content .pre-content').html(target.value);
  };

  const signChange = (target) => {
    //let content = target.value.replace(/\r\n|\r|\n/g, "<br />")
    console.log(target);
    if(target.target.files.length == 0)
      $('.frame-content .sign-content').html("");
    else {
      const reader = new FileReader();
      const file = target.target.files[0];

      reader.addEventListener("load", function () {
        // convert image file to base64 string
        $('.frame-content .sign-content').html("<image style='width:100%; height:100%; object-fit: cover;' src='" + reader.result + "'></image>");
      }, false);
    
      if (file) {
        reader.readAsDataURL(file);
      }
    }
  };

  const updateRecipient = (event) => {
    setRecipient(event.target.value)
  }
  const awsFrame = () => {
    var albumBucketName = 'assets-greetz';
    AWS.config.region = 'us-west-1'; // Region 
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-west-1:837fc2da-f4ef-4686-8323-815cf4049161',
    });

    // AWS - frame image fetching
    var s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: { Bucket: albumBucketName }
    });

    s3.listObjects({ Delimiter: '/frames' }, function (err, data) {
      if (err) {
        return alert('There was an error listing your albums: ' + err.message);
      } else {
        let imgs = [];
        data.Contents.map(function (item, i) {
          imgs.push({ imagePath: 'https://d1b245q87ffzvi.cloudfront.net/' + item['Key'] })
        });
        setFrameArray(d => [...d, ...imgs]);
      }
    });
  };
  
  const fontFamilyArray = [
    { fontFamily: "Roboto", value: "'Roboto', sans-serif" },
    { fontFamily: "Baloo Bhaijaan", value: "'Baloo Bhaijaan 2', cursive" },
    { fontFamily: "Fira Sans", value: "'Fira Sans', sans-serif" },
    { fontFamily: "Lobster", value: "'Lobster', cursive" },
    { fontFamily: "Pacifico", value: "'Pacifico', cursive" },
    { fontFamily: "Permanent Marker", value: "'Permanent Marker', cursive" },
    { fontFamily: "Rubik", value: "'Rubik', sans-serif" }
  ]
  const fontSizeArray = [
    { fontSize: "14", value: "14px" },
    { fontSize: "16", value: "16px" },
    { fontSize: "18", value: "18px" },
    { fontSize: "20", value: "20px" },
    { fontSize: "22", value: "22px" },
    { fontSize: "24", value: "24px" },
    { fontSize: "26", value: "26px" },
    { fontSize: "28", value: "28px" },
    { fontSize: "30", value: "30px" },
    { fontSize: "32", value: "32px" },
    { fontSize: "34", value: "34px" },
    { fontSize: "36", value: "36px" },
  ]
  const frameSet = (e) => {
    let elm = $(e.target).clone();
    $('.frame-block .frame').remove();
    $('.frame-block').append(elm);
  }

  /* Create an instance of the client */
  const ipfsUploadClient = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

  const mint = async () => {
    setMiningAnimation(true);
    if(isEthereum)
    {
      await mintEthNFT();
    }
    else{
      await mintSolNFT();
    }
  }

  const mintEthNFT = useCallback(async () => {
    console.log(ethereumWalletAccount)
    if(ethereumWalletAccount == null){
      toast.warn("Please connect your wallet!",{
        autoClose: 10000,
      });
      setMiningAnimation(false);
      return;
    }

    let findValue = 1080 / ($('.frame-block').outerWidth());
    htmlToImage.toPng(document.getElementById('capture'), { pixelRatio: findValue })
      .then(async function (dataUrl) {
        console.log(dataUrl);

        toast("Prepaing Image...");

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const imageFile = new File([blob], 'image.png', { type: 'image/png' });

        toast("Uploading Image...");

        /* upload the file */
        const imageUrl = await ipfsUploadClient.add(imageFile);

        const attributes = {
          name: 'Greetz',
          attributes: [
            {
              trait_type: 'Text',
              value: content,
            },
            {
              trait_type: 'Background Color',
              value: bgColor,
            },
            {
              trait_type: 'Text Color',
              value: textColor,
            },
            {
              trait_type: 'Token ID',
              value: uuidv4(),
            },
          ],
          image: 'https://ipfs.infura.io/ipfs/' + imageUrl.path,
        };

        const strAttributes = JSON.stringify(attributes);
        const blobAttributes = new Blob([strAttributes], { type: 'application/json' });
        const attributeFile = new File([ blobAttributes ], 'attributes.json', { type: 'text/json' });
        toast("Uploading Metadata...");
        const metadataUrl = await ipfsUploadClient.add(attributeFile);

        toast("Minting Started...");
        await askContractToMintNft(recipient,'https://ipfs.infura.io/ipfs/' + metadataUrl.path);
        toast("NFT minted...");
        setMiningAnimation(false);
      });
  }, [ethereumWalletAccount, bgColor, content, recipient, textColor]);

  const mintSolNFT = useCallback(async () => {
    if(publicKey == null)
    {
      toast.warn("Please connect your wallet!",{
        autoClose: 10000,
      });
      return;
    }
    // toast.info(<InfoMsg/>,{
    //   autoClose: 30000,
    // });
    console.log(publicKey, connection);
    let findValue = 1080 / ($('.frame-block').outerWidth());
    htmlToImage.toPng(document.getElementById('capture'), { pixelRatio: findValue })
      .then(async function (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        console.log(blob);
        const imageFile = new File([blob], 'image.png', { type: 'image/png' });
        extendBorsh();
        const metadata = {
          animation_url: undefined,
          creators: [
            new Creator({
              // Page owner's cut
              address: new PublicKey('6DP69M94Cez8xGiQ9DvxqpHMULEmGHLDiVXicwZcMwPK'),
              verified: false,
              share: 10,
            }),
            new Creator({
              // Minter's cut
              address: new PublicKey(publicKey.toString()),
              verified: true,
              share: 90,
            }),
          ],
          description: 'GREETZ',
          external_url: 'https://www.greetz.io',
          image: imageFile.name,
          name: 'Greetz Card',
          symbol: '',
          // Royalties
          sellerFeeBasisPoints: 15,
          attributes: [
            {
              trait_type: 'Text',
              value: content,
            },
            {
              trait_type: 'Background Color',
              value: bgColor,
            },
            {
              trait_type: 'Text Color',
              value: textColor,
            },
            {
              trait_type: 'Token ID',
              value: uuidv4(),
            },
          ],
          collection: null,
          properties: {
            category: 'image',
            files: [{ type: imageFile.type, uri: imageFile.name }],
          },
        };
        try {
          const result = await mintNFT(connection, wallet, [imageFile], metadata, recipient);
        } catch (error) {
          console.error(error);
          setMiningAnimation(false);
        }
        setMiningAnimation(false);
      });
  }, [publicKey, wallet, connection, bgColor, content, recipient, textColor]);

  const frameWidthHeight = () => {
    let elmbg = document.querySelector('.frame-block')
    let getBG = elmbg.style.backgroundColor;
    $('.frame-block').removeAttr("style").css('background-color', getBG);
    //$('.middle-panel').removeAttr("style");

    let balnceHeight = $(window).height() - ($('header').height() + $('footer').height());
    if ($(window).width() > 900) {
      balnceHeight = balnceHeight - 45;
    }
    let frameWidth = $('.frame-block').width();
    let finalWidthHeight = null;
    if (frameWidth < balnceHeight) {
      finalWidthHeight = frameWidth
    } else {
      finalWidthHeight = balnceHeight
    }
    if ($(window).width() > 900) {
      $('.frame-block').height(finalWidthHeight).width(finalWidthHeight)
      //$('.middle-panel').width($('.frame-block').outerWidth())
    } else {
      $('.frame-block').height($('.frame-block').width())
    }
  }

  const networkToggle = () => {
    setIsEthereum(!isEthereum);
    setRecipient('');
  }

  $(window).resize(function () {
    clearTimeout(this.id);
    this.id = setTimeout(frameWidthHeight(), 1000);
  });
  useEffect(() => {
    frameWidthHeight();
    awsFrame()
  }, []);


  return (
    <div>
      {
        miningAnimation ? (
          <Modal />
        ) : null
      }
      <div style={{ backgroundImage: `url('./header-bg.png')`, backgroundRepeat: 'no-repeat', backgroundColor: '#ECF1F5', backgroundSize: '100% auto' }}>
        <ToastContainer/>
        <header>
          <div className="d-flex h-100 align-items-start container">
            <a href="/" className="logo">
              <img src={'./logo.png'} alt="Greetz" />
            </a>
            <div className="top-bar-container">
              <div className="top-bar-control">
                <div className="react-toggle-wrapper">
                  <Toggle
                    defaultChecked={true}
                    icons={{
                      checked: <SolanaIcon/>,
                      unchecked: <EthereumIcon/>,
                    }}
                    onChange={networkToggle}
                  />
                </div>
              </div>
              { isEthereum ? 
                (<div className="top-bar-control">
                  { renderConnectButton() }
                </div>) : 
                (<div className="top-bar-control">
                  <WalletMultiButton/>
                </div>)
              }
            </div>
          </div>
        </header>
        <main className="h-100 p-15 d-flex-tablet main">
          <div className="d-flex flex-direction-column left-panel">
            <div className="d-flex flex-wrap-wrap  frame-listing">
              {
                frameArray.map((item, index) => {
                  return (
                    <div key={index} className="frame-listing-block" onClick={(e) => frameSet(e)}>
                      { index === 0 ? (
                        <div className="frame" style={{ backgroundImage: "none" }}>
                        </div>
                      ) : (
                          <div className="frame" style={{ backgroundImage: "url(" + item.imagePath + ")" }}>
                          </div>
                        )}

                    </div>
                  )
                })
              }
            </div>
          </div>
          <div className="d-flex flex-direction-column middle-panel">
            <div className="">
            <div className="frame-block" id="capture" style={{ backgroundColor: bgColor }}>
              <div className="frame-content">
                <pre style={{ fontFamily: fontName, color: textColor, fontSize: fontSize }} className="pre-content">{content}</pre>
                <div className="sign-content"></div>
              </div>
            </div>
          </div>
          </div>
          <div className="d-flex flex-direction-column right-panel">
            <div className="d-flex align-items-center color-picker-block">
              <div className="d-flex flex-direction-column col-color col-background">
                <div className="color background">Background</div>
                <div className="color text  mt-5">
                  <ColorPicker
                    animation="slide-up"
                    color={bgColor}
                    onChange={bgColorUpdate}
                  />
                </div>
              </div>
              <div className="d-flex flex-direction-column col-color">
                <div className="color background">Text</div>
                <div className="color text  mt-5">
                  <ColorPicker
                    animation="slide-up"
                    color={textColor}
                    onChange={textColorUpdate}
                  />
                </div>
              </div>
            </div>
            <div className="d-flex font-update-block mb-15">
              <div className="d-flex flex-direction-column pr-15">
                <div className="font-name-label">Font</div>
                <div className="font-name mt-5"><select value={fontName} onChange={fontNameUpdate}>
                  {fontFamilyArray.map((item, i) =>
                    <option key={i} value={item.value}>{item.fontFamily}</option>
                  )}
                </select></div>
              </div>

              <div className="d-flex flex-direction-column">
                <div className="font-size-label">Font size</div>
                <div className="font-size mt-5"><select value={fontSize} onChange={fontSizeUpdate}>
                  {fontSizeArray.map((item, i) =>
                    <option key={i} value={item.value}>{item.fontSize}</option>
                  )}

                </select></div>
              </div>
            </div>
            <div className="mt-auto textarea-block">
              <div className={isEmojiActive ? 'd-flex emoji-block active' : 'd-flex emoji-block'}>
                <div className="ml-auto emoji-toggle" onClick={emojiShowToggle}>😀</div>

                <div className="emoji-picker">
                  <Picker onEmojiClick={onEmojiClick} />
                </div>

              </div>
              <div className="message-label">Message</div>
              <textarea name="textarea" className="mt-5" placeholder="Type here" value={content} onChange={(e) => { contentChange(e.target) }}></textarea>
              <p className="upload-image-block">Sign with an image (optional)
              <label for="files" class="btn-upload">Upload</label>
              <input id="files" style={{visibility:"hidden"}} type="file" onChange={(e) => { signChange(e)}}/> 
              </p>
            </div>
            <div className="mt-auto block-recipient-price">
              <div className="recipient-label">Wallet Address</div>
              <div className="recipient-block mb-15 mt-5">
                <input value={recipient || ''} onChange={updateRecipient} className="recipient-input" placeholder="Recipient Wallet Address" />
              </div>
              <div className="mt-auto d-flex align-items-center price-block">
                <div className="price-label ml-auto">
                Price: { isEthereum ? '0.0025 $ETH' : '0.05 $SOL'}
                </div>
                <button onClick={mint} className="btn-mint">MINT</button>
              </div>
            </div>
          </div>
        </main>
        <footer className="d-flex align-items-center" style={{ backgroundImage: "url('footer-bg.png')" }}>
          <a href="/" className="footer-logo">
            <img src={'./logo.png'} alt="Greetz" />
          </a>
          <a href="https://twitter.com/greetz_io" target="_blank" className="ico-twitter">
            <img src={'twitter-logo.svg'} alt="Twitter" />
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
