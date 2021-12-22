// SPDX-License-Identifier: MIT

pragma solidity >= 0.7.0 < 0.9.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

contract Greetz is ERC721Enumerable, Ownable, ERC721URIStorage {
  using Strings for uint256;
  address private admin = 0x7E9c5f7d4c14835222C5b287816F4c852b6b1a8C;
  event NewNFTMinted(address sender, uint256 tokenId);
  
  constructor() ERC721("Greetz", "GREETZ"){

  } 

  function mint(string memory metadataURI, address receiver) public payable{
    uint256 tokenId = totalSupply() + 1;
    uint256 amount = 0.0025 ether;

    require(msg.value >= amount, "");

    payable(admin).transfer(msg.value);

    _safeMint(receiver, tokenId);
    _setTokenURI(tokenId, metadataURI);
    emit NewNFTMinted(msg.sender, tokenId);
  }

  function setAdmin(address add) external onlyOwner{
    admin = add;
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