# Frontend Components Documentation

## Overview

This document provides comprehensive documentation for all React components in the IAMAI DAO frontend application.

## Component Architecture

### Component Structure
```
src/components/
├── ui/              # Base UI components
├── wallet/          # Wallet-related components
├── token/           # Token management components
├── staking/         # Staking interface components
├── governance/      # Governance components
├── marketplace/     # Marketplace components
├── forms/           # Form components
├── layout/          # Layout components
└── common/          # Shared components
```

## UI Components

### Button
Base button component with variants and states.

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors';
  const variants = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-purple-600 text-purple-600 hover:bg-purple-50',
    ghost: 'text-purple-600 hover:bg-purple-50'
  };
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}
```

### Card
Container component for content sections.

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-lg border border-gray-200',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}
```

### Input
Form input component with validation states.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helper,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2',
            'focus:border-purple-500 focus:ring-purple-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
}
```

## Wallet Components

### WalletButton
Main wallet connection button.

```typescript
interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  
  const handleClick = useCallback(() => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  }, [connected, disconnect, setVisible]);
  
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  return (
    <Button
      onClick={handleClick}
      disabled={connecting}
      loading={connecting}
      className={className}
    >
      {connected && publicKey
        ? truncateAddress(publicKey.toString())
        : 'Connect Wallet'
      }
    </Button>
  );
}
```

### WalletMultiButton
Advanced wallet button with dropdown.

```typescript
export function WalletMultiButton() {
  const { wallets, select, wallet, publicKey, disconnect, connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        {wallet?.adapter.icon && (
          <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5" />
        )}
        <span>
          {connected && publicKey
            ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
            : 'Select Wallet'
          }
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
          {connected ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Connected</span>
                <Button size="sm" variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                {publicKey?.toString()}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  onClick={() => {
                    select(wallet.adapter.name);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-6 h-6" />
                  <span>{wallet.adapter.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Token Components

### TokenBalance
Displays user's token balance.

```typescript
interface TokenBalanceProps {
  address?: string;
  showUSD?: boolean;
  className?: string;
}

export function TokenBalance({ address, showUSD = true, className }: TokenBalanceProps) {
  const { publicKey } = useWallet();
  const { balance, loading, error } = useTokenBalance(address || publicKey?.toString());
  const { price } = useTokenPrice();
  
  if (loading) return <Skeleton className="h-6 w-24" />;
  if (error) return <span className="text-red-500">Error loading balance</span>;
  
  const usdValue = balance * price;
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="font-semibold">
        {balance.toLocaleString()} IAMAI
      </div>
      {showUSD && (
        <div className="text-sm text-gray-500">
          ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}
```

### TokenTransfer
Component for transferring tokens.

```typescript
interface TokenTransferProps {
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
}

export function TokenTransfer({ onSuccess, onError }: TokenTransferProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { transfer } = useToken();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;
    
    setLoading(true);
    try {
      const signature = await transfer(recipient, parseFloat(amount));
      onSuccess?.(signature);
      setRecipient('');
      setAmount('');
      toast.success('Transfer successful!');
    } catch (error) {
      onError?.(error as Error);
      toast.error('Transfer failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Transfer Tokens</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Enter wallet address"
          required
        />
        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          min="0"
          step="0.000000001"
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Transfer
        </Button>
      </form>
    </Card>
  );
}
```

## Staking Components

### StakingInterface
Main staking interface component.

```typescript
export function StakingInterface() {
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const { stake } = useStaking();
  const { balance } = useTokenBalance();
  
  const tierInfo = {
    30: { name: 'Bronze', apy: 5, min: 100 },
    60: { name: 'Silver', apy: 8, min: 500 },
    90: { name: 'Gold', apy: 12, min: 1000 },
    180: { name: 'Platinum', apy: 20, min: 5000 }
  };
  
  const currentTier = tierInfo[duration as keyof typeof tierInfo];
  const estimatedRewards = amount ? 
    (parseFloat(amount) * currentTier.apy / 100 * duration / 365) : 0;
  
  const handleStake = async () => {
    if (!amount || parseFloat(amount) < currentTier.min) return;
    
    setLoading(true);
    try {
      await stake(parseFloat(amount), duration);
      toast.success('Tokens staked successfully!');
      setAmount('');
    } catch (error) {
      toast.error('Staking failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Stake IAMAI Tokens</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount to Stake
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min={currentTier.min}
            max={balance}
          />
          <div className="mt-1 text-sm text-gray-500">
            Available: {balance.toLocaleString()} IAMAI
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Lock Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg"
          >
            {Object.entries(tierInfo).map(([days, info]) => (
              <option key={days} value={days}>
                {days} Days - {info.name} Tier ({info.apy}% APY)
              </option>
            ))}
          </select>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Staking Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tier:</span>
              <span className="font-medium">{currentTier.name}</span>
            </div>
            <div className="flex justify-between">
              <span>APY:</span>
              <span className="font-medium">{currentTier.apy}%</span>
            </div>
            <div className="flex justify-between">
              <span>Lock Duration:</span>
              <span className="font-medium">{duration} days</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Rewards:</span>
              <span className="font-medium text-green-600">
                {estimatedRewards.toFixed(2)} IAMAI
              </span>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleStake}
          loading={loading}
          disabled={!amount || parseFloat(amount) < currentTier.min}
          className="w-full"
        >
          Stake Tokens
        </Button>
      </div>
    </Card>
  );
}
```

### StakingPositions
Displays user's staking positions.

```typescript
export function StakingPositions() {
  const { positions, loading, claimRewards, unstake } = useStaking();
  
  if (loading) return <div>Loading positions...</div>;
  if (!positions.length) return <div>No staking positions found.</div>;
  
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Your Staking Positions</h3>
      {positions.map((position) => (
        <Card key={position.id} className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium">{position.tier} Tier</h4>
              <p className="text-sm text-gray-500">
                {position.amount.toLocaleString()} IAMAI staked
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">APY</div>
              <div className="font-medium">{position.apy}%</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">Unlock Date</div>
              <div className="font-medium">
                {new Date(position.unlockDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Rewards Earned</div>
              <div className="font-medium text-green-600">
                {position.rewardsEarned.toFixed(2)} IAMAI
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => claimRewards(position.id)}
              disabled={position.rewardsEarned === 0}
            >
              Claim Rewards
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => unstake(position.id)}
              disabled={position.status !== 'active'}
            >
              {Date.now() < position.unlockDate ? 'Emergency Unstake' : 'Unstake'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

## Form Components

### FileUpload
Drag and drop file upload component.

```typescript
interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  className
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useIPFS();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => file.size <= maxSize);
    setFiles(validFiles);
    onUpload(validFiles);
  }, [maxSize, onUpload]);
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });
  
  const handleUpload = async () => {
    setUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }
      toast.success('Files uploaded successfully!');
      setFiles([]);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
        )}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500">
          or click to select files
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Selected Files:</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ))}
          <Button onClick={handleUpload} loading={uploading} className="w-full">
            Upload to IPFS
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Layout Components

### Header
Main application header.

```typescript
export function Header() {
  const { connected } = useWallet();
  const { user } = useAuth();
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <img src="/logo.svg" alt="IAMAI DAO" className="h-8 w-8" />
              <span className="text-xl font-bold">IAMAI DAO</span>
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/token" className="text-gray-600 hover:text-gray-900">
                Token
              </Link>
              <Link href="/staking" className="text-gray-600 hover:text-gray-900">
                Staking
              </Link>
              <Link href="/governance" className="text-gray-600 hover:text-gray-900">
                Governance
              </Link>
              <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">
                Marketplace
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {connected && user && (
              <div className="flex items-center space-x-2">
                <TokenBalance className="text-sm" />
              </div>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
}
```

## Component Testing

### Testing Utilities
```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WalletProvider wallets={[]} autoConnect>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Component Tests
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from './test-utils';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

For more information, see the [hooks documentation](./hooks.md) or [API documentation](../API.md).
