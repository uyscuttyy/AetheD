import { getAddress, verifyMessage } from "ethers";
import type { AccessProofVerifier } from "../../domain/src/index.js";

export const accessProofMessage = (input: { datasetVersionId: string; buyerAddress: string; timestamp: string }): string =>
  `AetheD dataset access\nVersion: ${input.datasetVersionId}\nBuyer: ${getAddress(input.buyerAddress)}\nTimestamp: ${input.timestamp}`;

export class EvmAccessProofVerifier implements AccessProofVerifier {
  constructor(private readonly maxAgeMs = 5 * 60 * 1000) {}

  async verify(input: { datasetVersionId: string; buyerAddress: string; timestamp: string; signature: string }): Promise<void> {
    const timestamp = Date.parse(input.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > this.maxAgeMs) throw new Error("Access proof has expired");
    const recovered = verifyMessage(accessProofMessage(input), input.signature);
    if (recovered.toLowerCase() !== getAddress(input.buyerAddress).toLowerCase()) throw new Error("Access proof signer does not match buyer");
  }
}
