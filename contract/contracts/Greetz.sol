// SPDX-License-Identifier: MIT

pragma solidity >= 0.7.0 < 0.9.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

contract Greetz is ERC721Enumerable, Ownable, ERC721URIStorage {
  using Strings for uint256;

  event NewNFTMinted(address sender, uint256 tokenId);

  constructor() ERC721("Greetz", "GREETZ"){

  }

  function mint(string memory metadataURI) public {
    uint256 tokenId = totalSupply() + 1;

    _safeMint(msg.sender, tokenId);
    _setTokenURI(tokenId, metadataURI);
    emit NewNFTMinted(msg.sender, tokenId);
  }

  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
    super._burn(tokenId);
  }

  function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
    require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
    return super.tokenURI(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }  
  
}