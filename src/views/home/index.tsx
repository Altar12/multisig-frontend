// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from '../../components/Wallet'

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Idl, Program } from '@project-serum/anchor'
import idl from '../../idl.json'
const programId = new PublicKey('5wgwCaNBvEBz2LCxdL5nTZSab8wwDDpHfX8RaoW1jRpu');
type WalletInfo = {
  address: PublicKey,
  name: string,
  m: number,
  n: number,
  memberCount: number,
};
type AccountType = {
  walletConfig?: {},
  walletAuth?: {},
  proposal?: {},
  voteCount?: {},
}
type WalletConfig = {
  discriminator: AccountType,
  name: string,
  m: BN,
  n: BN,
  owners: BN,
  ownerIdentites: [BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN],
  proposalLifetime: BN,
}


export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [userWallets, setUserWallets] = useState([])

  async function fetchUserWallets() {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      // fetch wallet auths belonging to user
      const walletAuths = await connection.getProgramAccounts(programId, {
        dataSlice: {
          offset: 33,
          length: 32,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: "2",
            }  
          },
          {
            memcmp: {
              offset: 1,
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
  }, [wallet.publicKey, connection])

  function createMultisig() {

  }

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
        <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
          My Wallets
        </h1>
        </div>
        {
          !wallet.publicKey &&
          <p>Please Connect Your Wallet</p>
        }
        {
          wallet.publicKey && !userWallets &&
          <p>You do not own any multisig</p>
        }
        { userWallets &&
          userWallets.map((userWallet, index) => {
            return <Wallet key={index} name={userWallet.name} memberCount={userWallet.memberCount} m={userWallet.m} n={userWallet.n} />
          })
        }
      </div>
      <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={createMultisig} disabled={!wallet.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Create New Multisig
                    </span>
      </button>
    </div>
  );
};
