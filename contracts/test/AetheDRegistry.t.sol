// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AetheDRegistry} from "../src/AetheDRegistry.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function expectRevert(bytes4 revertData) external;
    function prank(address sender) external;
}
contract AetheDRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    AetheDRegistry private registry;
    address private seller = address(0xA11CE);
    address private buyer = address(0xB0B);
    bytes32 private datasetId = keccak256("dataset-1");
    bytes32 private versionId = keccak256("1.0.0");
    bytes32 private datasetHash = keccak256("dataset-content");
    bytes32 private passportHash = keccak256("passport-content");
    bytes32 private storageRoot = keccak256("0g-storage-root");

    function setUp() public {
        registry = new AetheDRegistry();
        vm.prank(seller);
        registry.registerDataset(datasetId);
        vm.prank(seller);
        registry.registerVersion(datasetId, versionId, datasetHash, passportHash, storageRoot, 1 ether);
        vm.deal(buyer, 2 ether);
    }

    function testRegistersExactVersionIntegrityData() public view {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        AetheDRegistry.DatasetVersion memory version = registry.getVersion(versionKey);

        require(version.seller == seller, "seller mismatch");
        require(version.datasetHash == datasetHash, "dataset hash mismatch");
        require(version.passportHash == passportHash, "passport hash mismatch");
        require(version.storageRoot == storageRoot, "storage root mismatch");
        require(version.price == 1 ether, "price mismatch");
        require(version.active, "listing should be active");
    }

    function testRecordsVersionSpecificPurchaseAndAccruesProceeds() public {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        vm.prank(buyer);
        registry.purchase{value: 1 ether}(versionKey);

        require(registry.hasPurchased(versionKey, buyer), "purchase missing");
        require(registry.pendingProceeds(seller) == 1 ether, "proceeds mismatch");
    }

    function testRejectsIncorrectPayment() public {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        vm.expectRevert(AetheDRegistry.InvalidPayment.selector);
        vm.prank(buyer);
        registry.purchase{value: 0.5 ether}(versionKey);
    }

    function testRejectsDuplicatePurchase() public {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        vm.prank(buyer);
        registry.purchase{value: 1 ether}(versionKey);

        vm.expectRevert(AetheDRegistry.PurchaseAlreadyRecorded.selector);
        vm.prank(buyer);
        registry.purchase{value: 1 ether}(versionKey);
    }

    function testOnlyDatasetSellerCanRegisterVersion() public {
        vm.expectRevert(AetheDRegistry.UnauthorizedSeller.selector);
        vm.prank(buyer);
        registry.registerVersion(datasetId, keccak256("2.0.0"), datasetHash, passportHash, storageRoot, 2 ether);
    }

    function testSellerCanPauseListing() public {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        vm.prank(seller);
        registry.updateListing(versionKey, 1 ether, false);

        vm.expectRevert(AetheDRegistry.VersionNotForSale.selector);
        vm.prank(buyer);
        registry.purchase{value: 1 ether}(versionKey);
    }

    function testSellerWithdrawsAccruedProceeds() public {
        bytes32 versionKey = registry.getVersionKey(datasetId, versionId);
        vm.prank(buyer);
        registry.purchase{value: 1 ether}(versionKey);
        uint256 balanceBefore = seller.balance;

        vm.prank(seller);
        registry.withdrawProceeds();

        require(seller.balance == balanceBefore + 1 ether, "withdrawal mismatch");
        require(registry.pendingProceeds(seller) == 0, "proceeds not cleared");
    }
}
