// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from '../../components/Wallet'
import bs58 from 'bs58'
import { sha256 } from 'js-sha256';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

import { CreateWallet } from 'components/CreateWallet'
import { WalletDetails } from 'components/WalletDetails';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Idl, Program } from '@project-serum/anchor'
import idl from '../../idl.json'
const programId = new PublicKey('39FJGfw5aXNhpNN3bJAVQeDpm6AsNRupUD8L7NBPvABp');
type WalletInfo = {
  address: PublicKey,
  name: string,
  m: number,
  n: number,
  memberCount: number,
};
type WalletConfig = {
  name: string,
  m: BN,
  n: BN,
  owners: BN,
  ownerIdentites: [BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN],
  proposalLifetime: BN,
}
type WalletDetails = {
  name: string,
  memberCount: number,
  m: number,
  n: number,
  proposalLifetime: number, // raw i.e. in seconds
  members: string[],
  address: PublicKey,
}


export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [userWallets, setUserWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [createWallet, setCreateWallet] = useState(false)

  async function fetchUserWallets() {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      // fetch wallet auths belonging to user
      const discriminator = Buffer.from(sha256.digest("account:WalletAuth")).subarray(0, 8)
      const walletAuths = await connection.getProgramAccounts(programId, {
        dataSlice: {
          offset: 40,
          length: 32,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(discriminator),
            }  
          },
          {
            memcmp: {
              offset: 8,
              bytes: wallet.publicKey.toBase58(),
            }
          }
        ]
      });
      // fetch wallet info corresponding to each wallet auth
      const walletAddresses = walletAuths.map((walletAuth) => new PublicKey(walletAuth.account.data))
      let walletInfos: WalletInfo[] = []
      
      const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
      const program = new Program(idl as Idl, programId, provider)
      let walletConfig: WalletConfig;
      for (let i=0; i<walletAddresses.length; ++i) {
        walletConfig = await program.account.walletConfig.fetch(walletAddresses[i]) as WalletConfig
        walletInfos.push({
          address: walletAddresses[i],
          name: walletConfig.name,
          m: Number(walletConfig.m),
          n: Number(walletConfig.n),
          memberCount: Number(walletConfig.owners)
        })
      }
      // initialize userWallets
      setUserWallets(walletInfos)
    }
  }
  useEffect(() => {
    fetchUserWallets()
  }, [wallet.publicKey, connection, createWallet])

  function turnOffCreationMode() {
    setCreateWallet(false)
  }
  function createMultisig() {
    setCreateWallet(true)
  }
  async function setWallet(index: number) {
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
    const program = new Program(idl as Idl, programId, provider)
    const walletConfig = await program.account.walletConfig.fetch(userWallets[index].address) as WalletConfig
    const discriminator = Buffer.from(sha256.digest("account:WalletAuth")).subarray(0, 8)
    const walletAuths = await connection.getProgramAccounts(programId, {
      dataSlice: {
        offset: 8,
        length: 32
      },
      filters: [
        { 
          memcmp: {
            offset: 40,
            bytes: userWallets[index].address.toBase58()
          }
        },
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(discriminator)
          }
        }
      ]
    })
    const selectedWallet: WalletDetails = {
      name: walletConfig.name,
      memberCount: Number(walletConfig.owners),
      m: Number(walletConfig.m),
      n: Number(walletConfig.n),
      proposalLifetime: Number(walletConfig.proposalLifetime),
      members: walletAuths.map((walletAuth) => new PublicKey(walletAuth.account.data).toBase58()),
      address: userWallets[index].address
    }
    setSelectedWallet(selectedWallet)
  }

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {
          !createWallet && !selectedWallet &&
          <div className='mt-6'>
            <button
                    className="m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={createMultisig} disabled={!wallet.publicKey} 
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Create New Multisig
                    </span>
        </button>
        <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
          My Wallets
        </h1>
        </div>
        }
        {
          !wallet.publicKey && 
          <p>Please Connect Your Wallet</p>
        }
        {
          selectedWallet && !createWallet &&
          <WalletDetails name={selectedWallet.name} m={selectedWallet.m} n={selectedWallet.n} memberCount={selectedWallet.memberCount} proposalLifetime={selectedWallet.proposalLifetime} members={selectedWallet.members} address={selectedWallet.address} />
        }
        {
          wallet.publicKey && userWallets.length===0 && !createWallet &&
          <p>You do not own any multisig!!</p>
        }
        { userWallets && !createWallet && !selectedWallet &&
          <div className="grid grid-cols-4 gap-4">
            {
              userWallets.map((userWallet, index) => {
                return <span key={index} onClick={() => setWallet(index)} style={{cursor: "pointer"}} className="text-center"><Wallet  name={userWallet.name} memberCount={userWallet.memberCount} m={userWallet.m} n={userWallet.n} /></span>
              })
            }
          
          </div>
        }
      </div>
      {
        createWallet &&
        <CreateWallet switchMode={turnOffCreationMode} />
      }
      
    </div>
  );
};
