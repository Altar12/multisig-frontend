
import { FC, useEffect, useState } from "react";
import { Wallet } from '../../components/Wallet'

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

export const BasicsView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [wallets, setWallets] = useState([])

  async function fetchWallets() {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      // fetch all wallet config addresses
      const walletConfigs = await connection.getProgramAccounts(programId, {
        dataSlice: {
          offset: 0,
          length: 0,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: "1",
            }
          }
        ]
      })
      // fetch data for each wallet config
      let walletInfos: WalletInfo[] = []
      const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
      const program = new Program(idl as Idl, programId, provider)
      let walletConfig: WalletConfig
      for (let i=0; i<walletConfigs.length; ++i) {
        walletConfig = await program.account.walletConfig.fetch(walletConfigs[i].pubkey) as WalletConfig
        walletInfos.push({
          address: walletConfigs[i].pubkey,
          name: walletConfig.name,
          m: Number(walletConfig.m),
          n: Number(walletConfig.n),
          memberCount: Number(walletConfig.owners)
        })
      }
      
      // initialize userWallets
      setWallets(walletInfos)
    }
  }
  useEffect(() => {
    fetchWallets()
  }, [wallet.publicKey, connection])
  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mt-10 mb-8">
          Explore Wallets
        </h1>
        {/* CONTENT GOES HERE */}
        <div className="text-center">
        {
          !wallet.publicKey &&
          <p>Please Connect Your Wallet</p>
        }
        {
          wallet.publicKey && !wallets &&
          <p>No Multisigs have been created!!</p>
        }
        { wallets &&
          wallets.map((userWallet, index) => {
            return <Wallet key={index} name={userWallet.name} memberCount={userWallet.memberCount} m={userWallet.m} n={userWallet.n} />
          })
        }
        </div>
      </div>
    </div>
  );
};
