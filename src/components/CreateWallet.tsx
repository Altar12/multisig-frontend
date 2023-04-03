// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState, Fragment } from 'react';
import { notify } from "../utils/notifications";
import { AccountMeta, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@project-serum/anchor'
import idl from '../idl.json'

interface Props {
    switchMode: () => void,
}

const programId = new PublicKey('39FJGfw5aXNhpNN3bJAVQeDpm6AsNRupUD8L7NBPvABp')

export const CreateWallet: FC<Props> = ({switchMode}) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [config, setConfig] = useState({
        name: '',
        owner: '',
        m: 1,
        n: 1,
        proposalLifetime: 10,
    })
    const [owners, setOwners] = useState([])
    const [validParams, setValidParams] = useState(true)
    const {name, owner, m, n, proposalLifetime} = config;

    const onChange = (event) => {
        setConfig({...config, [event.target.name]:event.target.value});
        const name = event.target.name.toString()
        if (name !== 'm' || name !== 'n') {
            return;
        } else if (name === 'm') {
            const m = event.target.value
            if (m === null || n === null || m<1 || n<1 || m>255 || n>255 || m>n) {
                setValidParams(false)
            } else {
                setValidParams(true)
            }
        } else if (name === 'n') {
            const n = event.target.value
            if (m === null || n === null || m<1 || n<1 || m>255 || n>255 || m>n) {
                setValidParams(false)
            } else {
                setValidParams(true)
            }
        }
        
    };
    async function submitHandler(event) {
        event.preventDefault()
        if (name === '') {
            notify({ type: 'error', message: `Empty name!`, description: "wallet name not set" });
            return;
        }
        if (!validParams) {
            notify({ type: 'error', message: `Invalid Parameters!`, description: "wallet parameters are empty" });
            return;
        }
        if (proposalLifetime===null || proposalLifetime < 10) {
            notify({ type: 'error', message: `Invalid Proposal Lifetime!`, description: "minimum proposal lifetime must be 10 mins" });
            return;
        }
        try {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
            const program = new Program(idl as Idl, programId, provider)
            const multisigWallet = Keypair.generate()
            const [walletAuth] = PublicKey.findProgramAddressSync([Buffer.from("owner"), multisigWallet.publicKey.toBuffer(), wallet.publicKey.toBuffer()], programId)
            const ownerKeys = owners.map(owner => new PublicKey(owner))
            const remainingAccounts: AccountMeta[] = ownerKeys.map((owner) => {
                const [address] = PublicKey.findProgramAddressSync([Buffer.from("owner"), multisigWallet.publicKey.toBuffer(), owner.toBuffer()], programId)
                return {
                    pubkey: address,
                    isSigner: false,
                    isWritable: true,
                }
            })
                await program.methods.createWallet(name, new BN(m), new BN(n), ownerKeys, new BN(proposalLifetime*60))
                                             .accounts({
                                                user: wallet.publicKey,
                                                wallet: multisigWallet.publicKey,
                                                walletAuth,
                                             })
                                             .remainingAccounts(remainingAccounts)
                                             .signers([multisigWallet])
                                             .rpc()
        } catch (error) {
            notify({ type: 'error', message: `Creation failed!`, description: error?.message });
            console.error(error)
            return
        }
        setConfig({
            name: '',
            owner: '',
            m: 1,
            n: 1,
            proposalLifetime: 10,
        })
        switchMode()
    }
    function addOwner(event) {
        event.preventDefault()
        if (!isValidAddress(owner)) {
            notify({ type: 'error', message: `Invalid Address!`, description: "invalid address" });
            return;
        }
        if (owners.includes(owner) || owner === wallet.publicKey.toBase58()) {
            notify({ type: 'error', message: `Can't add same owner twice`, description: "trying to duplicate owner" });
            return;
        }
        setOwners(owners.concat(owner));
        setConfig({...config, owner: ''});
    }
    function removeOwner(owner: string) {
        setOwners(owners.filter((current) => current !== owner))
    }
    function isValidAddress(input: string): boolean {
        if (input.length < 32 || input.length > 44)
          return false
        let asciiValue: number
        for (let index=0; index<input.length; index++) {
          asciiValue = input.charCodeAt(index)
          if (asciiValue>47 && asciiValue<58
              || asciiValue>64 && asciiValue<91
              || asciiValue>96 && asciiValue<123)
              continue
          return false
        }
        if (input.includes("0")
            || input.includes("I")
            || input.includes("O")
            || input.includes("l"))
          return false
        return true
      }

    return (
        <div className="relative group">
          <div className="max-w-md mx-auto bg-primary border-2 border-[#5252529f] p-6 px-10 my-2">
          <form onSubmit={submitHandler}>
            <h2>Create Multisig Wallet</h2>
            <input style={{marginBottom: 20, color: "black"}} type="text" name="name" placeholder="Name" value={name} onChange={onChange} />
            <input className="block" style={{marginBottom: 20, color: "black"}} type="text" name="owner" placeholder="Owner" value={owner} onChange={onChange} />
            <button className="btn" style={{marginBottom: 20}} onClick={addOwner}>Add Owner</button>
            <input className="block" style={{marginBottom: 20, color: "black"}} type="number" name="m" placeholder="m" value={m} onChange={onChange} />
            <input className="block" style={{marginBottom: 20, color: "black"}} type="number" name="n" placeholder="n" value={n} onChange={onChange} />
            <input className="block" style={{marginBottom: 20, color: "black"}} type="number" name="proposalLifetime" placeholder="Proposal Lifetime (mins)" value={proposalLifetime} onChange={onChange} />
            <input className="block btn" style={{width: 200}} type="submit" value={'Create'} />
        </form>
        </div>
        <p>{ validParams?`Minimum votes required for a proposal: ${Math.floor((m*(owners.length+1))/n)}`:'Invalid Wallet Parameterss'}</p>
        {
            owners.map((owner, index) => {
                return <button key={index}
                        className="group  m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={()=> removeOwner(owner)}
                        >
                        <span className="block group-disabled:hidden" >{`${owner.substr(0,5)}...`}</span>
                        </button>
            })
        }
        </div>
    );
};
