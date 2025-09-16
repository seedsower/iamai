const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  getOrCreateAssociatedTokenAccount, 
  transfer, 
  mintTo,
  getAssociatedTokenAddress
} = require('@solana/spl-token');
const fs = require('fs');

async function mintAndSendTokens() {
  // Connection to Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the deployment wallet keypair
  const deployWalletData = JSON.parse(fs.readFileSync('/home/seedslayer/.config/solana/id.json', 'utf8'));
  const deployWallet = Keypair.fromSecretKey(new Uint8Array(deployWalletData));
  
  // IAMAI token mint address
  const mintAddress = new PublicKey('5ieP1Z14NwuJpWeanJWXLKBENwNzqMvXkwdLEC5kpfbu');
  
  // Recipient address
  const recipientAddress = new PublicKey('5jddEQQjHNwrjf6NBjAhCaxZ3ZS2mzaeS4i3E4jLqqsm');
  
  // Amount to send (1000 tokens with 9 decimals)
  const amount = 1000 * Math.pow(10, 9);
  
  try {
    console.log('Starting token mint and transfer...');
    console.log('Mint Address:', mintAddress.toString());
    console.log('Deploy Wallet:', deployWallet.publicKey.toString());
    console.log('Recipient:', recipientAddress.toString());
    console.log('Amount:', amount / Math.pow(10, 9), 'IAMAI tokens');
    
    // Get or create deploy wallet's token account
    const deployTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      deployWallet,
      mintAddress,
      deployWallet.publicKey
    );
    
    console.log('Deploy wallet token account:', deployTokenAccount.address.toString());
    
    // Check current balance
    const currentBalance = await connection.getTokenAccountBalance(deployTokenAccount.address);
    console.log('Current balance:', currentBalance.value.uiAmount || 0, 'IAMAI tokens');
    
    // Mint tokens to deploy wallet if needed
    if ((currentBalance.value.uiAmount || 0) < 1000) {
      console.log('Minting tokens to deploy wallet...');
      const mintSignature = await mintTo(
        connection,
        deployWallet, // payer
        mintAddress,
        deployTokenAccount.address,
        deployWallet, // mint authority
        amount + (10000 * Math.pow(10, 9)) // mint extra for future use
      );
      
      console.log('Mint successful!');
      console.log('Mint signature:', mintSignature);
      
      // Wait for confirmation
      await connection.confirmTransaction(mintSignature);
      
      // Check new balance
      const newBalance = await connection.getTokenAccountBalance(deployTokenAccount.address);
      console.log('New balance after mint:', newBalance.value.uiAmount, 'IAMAI tokens');
    }
    
    // Get or create recipient's token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      deployWallet, // payer
      mintAddress,
      recipientAddress
    );
    
    console.log('Recipient token account:', recipientTokenAccount.address.toString());
    
    // Perform the transfer
    console.log('Transferring tokens...');
    const transferSignature = await transfer(
      connection,
      deployWallet, // payer
      deployTokenAccount.address, // source
      recipientTokenAccount.address, // destination
      deployWallet, // owner
      amount
    );
    
    console.log('Transfer successful!');
    console.log('Transfer signature:', transferSignature);
    console.log('Explorer URL:', `https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    
    // Verify the transfer
    const recipientBalance = await connection.getTokenAccountBalance(recipientTokenAccount.address);
    console.log('Recipient final balance:', recipientBalance.value.uiAmount, 'IAMAI tokens');
    
    const senderFinalBalance = await connection.getTokenAccountBalance(deployTokenAccount.address);
    console.log('Sender final balance:', senderFinalBalance.value.uiAmount, 'IAMAI tokens');
    
  } catch (error) {
    console.error('Operation failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

mintAndSendTokens();
