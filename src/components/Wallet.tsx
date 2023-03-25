// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback } from 'react';
import { notify } from "../utils/notifications";
import { PublicKey } from '@solana/web3.js';
interface Props {
    name: string,
    memberCount: number,
    m: number,
    n: number,
}

export const Wallet: FC<Props> = ({ name, memberCount, m, n }) => {

    return (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
          <div className="max-w-md mx-auto bg-primary border-2 border-[#5252529f] p-6 px-10 my-2">
          <p>{name}</p>
          <p>{`Members: ${memberCount}`}</p>
          <p>{`Required Approvals: ${Math.floor((memberCount*m)/n)}`}</p>
          </div>           
        </div>
    );
};
