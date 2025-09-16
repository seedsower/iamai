const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { 
  getOrCreateAssociatedTokenAccount, 
  transfer, 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} = require('@solana/spl-token');
const fs = require('fs');

async function sendTokens() {
  // Connection to Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the deployment wallet keypair (has authority over tokens)
  const deployWalletData = JSON.parse(fs.readFileSync('/home/seedslayer/.config/solana/id.json', 'utf8'));
  const deployWallet = Keypair.fromSecretKey(new Uint8Array(deployWalletData));
  
  // IAMAI token mint address
  const mintAddress = new PublicKey('5ieP1Z14NwuJpWeanJWXLKBENwNzqMvXkwdLEC5kpfbu');
  
  // Recipient address
  const recipientAddress = new PublicKey('5jddEQQjHNwrjf6NBjAhCaxZ3ZS2mzaeS4i3E4jLqqsm');
  
  // Amount to send (1000 tokens with 9 decimals)
  const amount = 1000 * Math.pow(10, 9);
  
  try {
    console.log('Starting token transfer...');
    console.log('Mint Address:', mintAddress.toString());
    console.log('Recipient:', recipientAddress.toString());
    console.log('Amount:', amount / Math.pow(10, 9), 'IAMAI tokens');
    
    // Get sender's token account (deployment wallet)
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      deployWallet.publicKey
    );
    
    // Get or create recipient's token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      deployWallet, // payer
      mintAddress,
      recipientAddress
    );
    
    console.log('Sender token account:', senderTokenAccount.toString());
    console.log('Recipient token account:', recipientTokenAccount.address.toString());
    
    // Check sender balance
    const senderBalance = await connection.getTokenAccountBalance(senderTokenAccount);
    console.log('Sender balance:', senderBalance.value.uiAmount, 'IAMAI tokens');
    
    if (senderBalance.value.uiAmount < 1000) {
      throw new Error('Insufficient balance for transfer');
    }
    
    // Perform the transfer
    const signature = await transfer(
      connection,
      deployWallet, // payer
      senderTokenAccount, // source
      recipientTokenAccount.address, // destination
      deployWallet, // owner
      amount
    );
    
    console.log('Transfer successful!');
    console.log('Transaction signature:', signature);
    console.log('Explorer URL:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify the transfer
    const recipientBalance = await connection.getTokenAccountBalance(recipientTokenAccount.address);
    console.log('Recipient new balance:', recipientBalance.value.uiAmount, 'IAMAI tokens');
    
  } catch (error) {
    console.error('Transfer failed:', error.message);
    process.exit(1);
  }
}

sendTokens();
