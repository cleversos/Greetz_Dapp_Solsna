import React, { useState, useEffect, useMemo, useCallback } from "react";
import 'rc-color-picker/assets/index.css';
import ColorPicker from 'rc-color-picker';
import Picker from 'emoji-picker-react';
import './App.scss';
import $ from 'jquery';
import { saveAs } from 'file-saver';

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

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
  const { connection } = useConnection();
  const { publicKey, wallet} = useWallet();
  console.log(useWallet(), "walleteee")
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
          imgs.push({ imagePath: 'https://assets-greetz.s3.us-west-1.amazonaws.com/' + item['Key'] })
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
  const mint = useCallback(async () => {
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
          toast(error.message);
          console.error(error);
        }
      });
  }, [publicKey, wallet, connection, bgColor, content, recipient, textColor]);

  const frameWidthHeight = () => {
    let elmbg = document.querySelector('.frame-block')
    let getBG = elmbg.style.backgroundColor;
    $('.frame-block').removeAttr("style").css('background-color', getBG);
    $('.right-panel').removeAttr("style");

    let balnceHeight = $(window).height() - ($('header').height() + $('.block-recipient-price').height());
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
      $('.right-panel').width($('.frame-block').outerWidth())
    } else {
      $('.frame-block').height($('.frame-block').width())
    }
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
    <div style={{ backgroundImage: `url('./body-bg.jpg')`, backgroundSize: 'cover' }}>
      <ToastContainer/>
      <header>
        <div className="d-flex h-100 align-items-center container">
          <a href="/" className="logo">
            <img src={'./logo.png'} alt="Greetz" />
          </a>
          <div className="ml-auto">
            <WalletMultiButton/>
          </div>
        </div>
      </header>
      <main className="h-100 p-15 d-flex-tablet main">

        <div className="d-flex flex-direction-column left-panel">
          <div className="frame-listing">
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
          <div className="mt-auto d-flex align-items-center color-picker-block">
            <div className="d-flex align-items-center col-color col-background">
              <div className="color background">Background</div>
              <div className="color text pl-10 mt-5">
                <ColorPicker
                  animation="slide-up"
                  color={bgColor}
                  onChange={bgColorUpdate}
                />
              </div>
            </div>
            <div className="d-flex align-items-center col-color">
              <div className="color background">Text</div>
              <div className="color text pl-10 mt-5">
                <ColorPicker
                  animation="slide-up"
                  color={textColor}
                  onChange={textColorUpdate}
                />
              </div>
            </div>
          </div>
          <div className="d-flex font-update-block">
            <div className="d-flex font-name">
              <div>Font name</div>
              <div className="pl-10"><select value={fontName} onChange={fontNameUpdate}>
                {fontFamilyArray.map((item, i) =>
                  <option key={i} value={item.value}>{item.fontFamily}</option>
                )}
              </select></div>
            </div>

            <div className="d-flex font-size">
              <div className="">Font size</div>
              <div className="pl-10"><select value={fontSize} onChange={fontSizeUpdate}>
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
            <textarea name="textarea" placeholder="Type here" value={content} onChange={(e) => { contentChange(e.target) }}></textarea>
          </div>
        </div>
        <div className="d-flex flex-direction-column right-panel">
          <div className="frame-block" id="capture" style={{ backgroundColor: bgColor }}>
            <div className="frame-content"><pre style={{ fontFamily: fontName, color: textColor, fontSize: fontSize }} className="pre-content">{content}</pre></div>
          </div>
          <div className="mt-auto block-recipient-price">
            <div className="recipient-block mb-15">
              <input value={recipient || ''} onChange={updateRecipient} className="recipient-input" placeholder="Recipient Wallet Address" />
            </div>
            <div className="mt-auto d-flex align-items-center price-block">
              <div className="price-label ml-auto">Price: 0.05 $SOL</div>
              <button onClick={mint} className="btn-mint">MINT</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
