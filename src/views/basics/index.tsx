
import { FC, useEffect, useState } from "react";
import { Wallet } from '../../components/Wallet'
import bs58 from 'bs58'
import { sha256 } from 'js-sha256';

import { WalletDetails } from "components/WalletDetails";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
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

export const BasicsView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)

  async function fetchWallets() {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      // fetch all wallet config addresses
      const discriminator = Buffer.from(sha256.digest("account:WalletConfig")).subarray(0, 8)
      const walletConfigs = await connection.getProgramAccounts(programId, {
        dataSlice: {
          offset: 0,
          length: 0,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(discriminator),
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
  async function setWallet(index) {
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
    const program = new Program(idl as Idl, programId, provider)
    const walletConfig = await program.account.walletConfig.fetch(wallets[index].address) as WalletConfig
    const walletAuths = await connection.getProgramAccounts(programId, {
      dataSlice: {
        offset: 1,
        length: 32
      },
      filters: [
        { 
          memcmp: {
            offset: 33,
            bytes: wallets[index].address.toBase58()
          }
        },
        {
          memcmp: {
            offset: 0,
            bytes: "2"
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
      address: wallets[index].address
    }
    setSelectedWallet(selectedWallet)
  }
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
          selectedWallet &&
          <WalletDetails name={selectedWallet.name} m={selectedWallet.m} n={selectedWallet.n} memberCount={selectedWallet.memberCount} proposalLifetime={selectedWallet.proposalLifetime} members={selectedWallet.members} address={selectedWallet.address}></WalletDetails>
        }
        {
          wallet.publicKey && wallets.length===0 &&
          <p>No Multisigs have been created!!</p>
        }
        { wallets &&
          <div className="grid grid-cols-4 gap-4">
            {
              wallets.map((userWallet, index) => {
                return <span key={index} onClick={()=>{ setWallet(index)}} style={{cursor: "pointer"}}><Wallet  name={userWallet.name} memberCount={userWallet.memberCount} m={userWallet.m} n={userWallet.n} /></span>
              })
            }
          
          </div>
        }
        </div>
      </div>
    </div>
  );
};
