export type RegistryPublicationInput = {
  datasetId: string;
  versionId: string;
  sellerAddress: string;
  datasetHash: string;
  passportHash: string;
  storageRoot: string;
};

export type RegistryPublication = {
  chainId: number;
  contractAddress: string;
  datasetKey: string;
  versionKey: string;
  datasetTransactionHash?: string;
  versionTransactionHash?: string;
};

export interface DatasetRegistryPublisher {
  readonly sellerAddress: string;
  publish(input: RegistryPublicationInput): Promise<RegistryPublication>;
}
