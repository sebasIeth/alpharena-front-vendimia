import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/**
 * Builds an SPL token transfer transaction.
 * The user signs this with their external wallet.
 */
export async function buildStakeTransaction({
  connection,
  senderPublicKey,
  recipientAddress,
  tokenMint,
  amount,
}: {
  connection: Connection;
  senderPublicKey: PublicKey;
  recipientAddress: string;
  tokenMint: string;
  amount: number; // atomic units
}): Promise<Transaction> {
  const mintPubkey = new PublicKey(tokenMint);
  const recipientPubkey = new PublicKey(recipientAddress);

  // Detect token program (Token vs Token-2022)
  const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
  if (!mintAccountInfo) throw new Error("Token mint not found on-chain");

  const programId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  // Get sender ATA
  const senderAta = await getAssociatedTokenAddress(
    mintPubkey,
    senderPublicKey,
    false,
    programId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Verify sender ATA exists and has sufficient balance
  try {
    const senderAccount = await getAccount(connection, senderAta, "confirmed", programId);
    if (senderAccount.amount < BigInt(amount)) {
      const humanBalance = Number(senderAccount.amount) / 10 ** 6;
      const humanAmount = amount / 10 ** 6;
      throw new Error(
        `Insufficient token balance. You have ${humanBalance.toFixed(2)} but tried to send ${humanAmount.toFixed(2)}`
      );
    }
  } catch (err: any) {
    if (err.name === "TokenAccountNotFoundError") {
      throw new Error(
        "You don't have this token in your wallet. Make sure you have the correct token and try again."
      );
    }
    throw err;
  }

  // Check sender has SOL for gas fees
  const solBalance = await connection.getBalance(senderPublicKey);
  if (solBalance < 10000) {
    throw new Error(
      "Insufficient SOL for transaction fees. You need a small amount of SOL to pay gas fees."
    );
  }

  // Get recipient ATA
  const recipientAta = await getAssociatedTokenAddress(
    mintPubkey,
    recipientPubkey,
    true,
    programId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const instructions: TransactionInstruction[] = [];

  // Check if recipient ATA exists, create if not
  const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
  if (!recipientAtaInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        senderPublicKey, // payer
        recipientAta,
        recipientPubkey,
        mintPubkey,
        programId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Transfer instruction
  instructions.push(
    createTransferInstruction(
      senderAta,
      recipientAta,
      senderPublicKey,
      BigInt(amount),
      [],
      programId
    )
  );

  const transaction = new Transaction().add(...instructions);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = senderPublicKey;

  return transaction;
}
