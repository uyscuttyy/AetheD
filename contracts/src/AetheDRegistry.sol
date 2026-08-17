// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AetheDRegistry {
    struct DatasetVersion {
        address seller;
        bytes32 datasetHash;
        bytes32 passportHash;
        bytes32 storageRoot;
        uint256 price;
        bool active;
    }

    error DatasetAlreadyRegistered();
    error DatasetNotRegistered();
    error EmptyIdentifier();
    error InvalidIntegrityHash();
    error InvalidPayment();
    error NothingToWithdraw();
    error PurchaseAlreadyRecorded();
    error SellerCannotPurchase();
    error TransferFailed();
    error UnauthorizedSeller();
    error VersionAlreadyRegistered();
    error VersionNotForSale();
    error VersionNotRegistered();

    mapping(bytes32 datasetId => address seller) public datasetSellers;
    mapping(bytes32 versionKey => DatasetVersion version) private versions;
    mapping(bytes32 versionKey => mapping(address buyer => bool purchased)) public hasPurchased;
    mapping(address seller => uint256 amount) public pendingProceeds;

    uint256 private withdrawalLock = 1;

    event DatasetRegistered(bytes32 indexed datasetId, address indexed seller);
    event DatasetVersionRegistered(
        bytes32 indexed datasetId,
        bytes32 indexed versionId,
        bytes32 indexed versionKey,
        address seller,
        bytes32 datasetHash,
        bytes32 passportHash,
        bytes32 storageRoot,
        uint256 price
    );
    event ListingUpdated(bytes32 indexed versionKey, uint256 price, bool active);
    event DatasetVersionPurchased(
        bytes32 indexed versionKey, address indexed buyer, address indexed seller, uint256 price
    );
    event ProceedsWithdrawn(address indexed seller, uint256 amount);

    function registerDataset(bytes32 datasetId) external {
        if (datasetId == bytes32(0)) revert EmptyIdentifier();
        if (datasetSellers[datasetId] != address(0)) revert DatasetAlreadyRegistered();

        datasetSellers[datasetId] = msg.sender;
        emit DatasetRegistered(datasetId, msg.sender);
    }

    function registerVersion(
        bytes32 datasetId,
        bytes32 versionId,
        bytes32 datasetHash,
        bytes32 passportHash,
        bytes32 storageRoot,
        uint256 price
    ) external returns (bytes32 versionKey) {
        if (datasetId == bytes32(0) || versionId == bytes32(0)) revert EmptyIdentifier();
        address seller = datasetSellers[datasetId];
        if (seller == address(0)) revert DatasetNotRegistered();
        if (seller != msg.sender) revert UnauthorizedSeller();
        if (datasetHash == bytes32(0) || passportHash == bytes32(0) || storageRoot == bytes32(0)) {
            revert InvalidIntegrityHash();
        }

        versionKey = getVersionKey(datasetId, versionId);
        if (versions[versionKey].seller != address(0)) revert VersionAlreadyRegistered();

        versions[versionKey] = DatasetVersion({
            seller: seller,
            datasetHash: datasetHash,
            passportHash: passportHash,
            storageRoot: storageRoot,
            price: price,
            active: true
        });
        emit DatasetVersionRegistered(
            datasetId, versionId, versionKey, seller, datasetHash, passportHash, storageRoot, price
        );
    }

    function updateListing(bytes32 versionKey, uint256 price, bool active) external {
        DatasetVersion storage version = versions[versionKey];
        if (version.seller == address(0)) revert VersionNotRegistered();
        if (version.seller != msg.sender) revert UnauthorizedSeller();

        version.price = price;
        version.active = active;
        emit ListingUpdated(versionKey, price, active);
    }

    function purchase(bytes32 versionKey) external payable {
        DatasetVersion storage version = versions[versionKey];
        if (version.seller == address(0)) revert VersionNotRegistered();
        if (!version.active) revert VersionNotForSale();
        if (msg.sender == version.seller) revert SellerCannotPurchase();
        if (hasPurchased[versionKey][msg.sender]) revert PurchaseAlreadyRecorded();
        if (msg.value != version.price) revert InvalidPayment();

        hasPurchased[versionKey][msg.sender] = true;
        pendingProceeds[version.seller] += msg.value;
        emit DatasetVersionPurchased(versionKey, msg.sender, version.seller, msg.value);
    }

    function withdrawProceeds() external {
        if (withdrawalLock != 1) revert TransferFailed();
        uint256 amount = pendingProceeds[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        withdrawalLock = 2;
        pendingProceeds[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        withdrawalLock = 1;
        if (!success) revert TransferFailed();

        emit ProceedsWithdrawn(msg.sender, amount);
    }

    function getVersion(bytes32 versionKey) external view returns (DatasetVersion memory) {
        DatasetVersion memory version = versions[versionKey];
        if (version.seller == address(0)) revert VersionNotRegistered();
        return version;
    }

    function getVersionKey(bytes32 datasetId, bytes32 versionId) public pure returns (bytes32) {
        return keccak256(abi.encode(datasetId, versionId));
    }
}
