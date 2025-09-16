const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

async function transferTokens() {
  // Connection to Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the deployment wallet keypair
  const deployWalletData = JSON.parse(fs.readFileSync('/home/seedslayer/.config/solana/id.json', 'utf8'));
  const deployWallet = Keypair.fromSecretKey(new Uint8Array(deployWalletData));
  
  // Set up Anchor provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(deployWallet),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);
  
  try {
    // Load the token program IDL
    const tokenProgramId = new PublicKey('F2iupsNmgY69NwD6a1ZETMhPPET8WLojYKDBbVCw72z2');
    const idl = JSON.parse(fs.readFileSync('./contracts/token/target/idl/iamai_token.json', 'utf8'));
    const program = new anchor.Program(idl, tokenProgramId, provider);
    
    // Token info and mint addresses
    const mintAddress = new PublicKey('5ieP1Z14NwuJpWeanJWXLKBENwNzqMvXkwdLEC5kpfbu');
    const recipientAddress = new PublicKey('5jddEQQjHNwrjf6NBjAhCaxZ3ZS2mzaeS4i3E4jLqqsm');
    
    // Amount to transfer (1000 tokens with 9 decimals)
    const amount = new anchor.BN(1000 * Math.pow(10, 9));
    
    console.log('Starting token transfer via smart contract...');
    console.log('Program ID:', tokenProgramId.toString());
    console.log('Mint Address:', mintAddress.toString());
    console.log('Recipient:', recipientAddress.toString());
    console.log('Amount:', amount.toString(), 'raw units (1000 IAMAI)');
    
    // Find token info PDA
    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from('token_info'), mintAddress.toBuffer()],
      tokenProgramId
    );
    
    // Get associated token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(mintAddress, deployWallet.publicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(mintAddress, recipientAddress);
    
    console.log('Token Info PDA:', tokenInfoPda.toString());
    console.log('Sender Token Account:', senderTokenAccount.toString());
    console.log('Recipient Token Account:', recipientTokenAccount.toString());
    
    // First, let's mint some tokens to the sender if needed
    console.log('Minting tokens to sender...');
    const mintTx = await program.methods
      .mintTokens(amount.add(new anchor.BN(10000 * Math.pow(10, 9)))) // mint extra
      .accounts({
        tokenInfo: tokenInfoPda,
        mint: mintAddress,
        to: senderTokenAccount,
        authority: deployWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log('Mint transaction:', mintTx);
    
    // Wait for confirmation
    await connection.confirmTransaction(mintTx);
    
    // Now transfer tokens to recipient
    console.log('Transferring tokens to recipient...');
    const transferTx = await program.methods
      .transferTokens(amount)
      .accounts({
        tokenInfo: tokenInfoPda,
        mint: mintAddress,
        from: senderTokenAccount,
        to: recipientTokenAccount,
        authority: deployWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log('Transfer successful!');
    console.log('Transfer transaction:', transferTx);
    console.log('Explorer URL:', `https://explorer.solana.com/tx/${transferTx}?cluster=devnet`);
    
    // Check final balances
    const senderBalance = await connection.getTokenAccountBalance(senderTokenAccount);
    const recipientBalance = await connection.getTokenAccountBalance(recipientTokenAccount);
    
    console.log('Sender final balance:', senderBalance.value.uiAmount, 'IAMAI tokens');
    console.log('Recipient final balance:', recipientBalance.value.uiAmount, 'IAMAI tokens');
    
  } catch (error) {
    console.error('Transfer failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

transferTokens();
