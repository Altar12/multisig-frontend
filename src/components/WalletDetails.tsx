// TODO: SignMessage
import { FC, useState, useEffect } from 'react';
import { notify } from "../utils/notifications";
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import * as token from '@solana/spl-token'
interface Props {
    name: string,
    memberCount: number,
    m: number,
    n: number,
    proposalLifetime: number, // raw i.e. in seconds
    members: string[],
    address: PublicKey,
}
type TokenDetails = {
    address: string,
    balance: number,
}
const programId = new PublicKey('5wgwCaNBvEBz2LCxdL5nTZSab8wwDDpHfX8RaoW1jRpu')

export const WalletDetails: FC<Props> = ({ name, memberCount, m, n, proposalLifetime, members, address }) => {
    const [tokens, setTokens] = useState([])

    async function fetchTokens() {
        const [authority] = PublicKey.findProgramAddressSync([Buffer.from("authority"), address.toBuffer()], programId)
        const connection = new Connection(clusterApiUrl('devnet'))
        const addresses = await connection.getProgramAccounts(token.TOKEN_PROGRAM_ID, {
            dataSlice: {
                offset: 0,
                length: 0,
            },
            filters: [
                {
                    dataSize: 0
                },
                {
                    memcmp: {
                        offset: 32,
                        bytes: authority.toBase58()
                    }
                }
            ]
        })
        let tokens: TokenDetails[]
        let tokenAccount: token.Account
        let mint: token.Mint
        for (let i=0; i<addresses.length; ++i) {
            tokenAccount = await token.getAccount(connection, addresses[i].pubkey)
            mint = await token.getMint(connection, tokenAccount.mint)
            tokens.push({
                address: tokenAccount.address.toBase58(),
                balance: Number(tokenAccount.amount)/ (10**mint.decimals)
            })
        }
        setTokens(tokens)
    }
    useEffect(() => {
        fetchTokens()
    })
    return (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
          <div className="max-w-md mx-auto bg-primary border-2 border-[#5252529f] p-6 px-10 my-2">
          <p>{name}</p>
          <p>{`Total Members: ${memberCount}`}</p>
          <p>{`Required Approvals: ${Math.floor((memberCount*m)/n)}`}</p>
          <p>{`Proposal Lifetime: ${proposalLifetime/60}`}</p>
          <p>Members:</p>
          {
            members.map((member, index) => {
                return <p key={index}>{member}</p>
            })
          }
          <p>Token Balances:</p>
          {
            tokens.map((token, index) => {
                return <p key={index}>{`${token.address}, ${token.balance}`}</p>
            })
          }
          </div>           
        </div>
    );
};
