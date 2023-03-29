// TODO: SignMessage
import { FC, useState, useEffect, Fragment } from 'react';
import { notify } from "../utils/notifications";
import { PublicKey, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as token from '@solana/spl-token'
import idl from '../idl.json'
import bs58 from 'bs58'
import { sha256 } from 'js-sha256';
import { Program, AnchorProvider, Idl, BN } from '@project-serum/anchor'
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
type ProposalDetails = {
    receiver: string,
    tokenAddress: string,
    amount: number,
    userVoted: boolean,
    executable: boolean,
    address: PublicKey,
    proposer: PublicKey,
}

type ProposalType = {
    transfer?: {
        tokenMint: PublicKey,
        receiveAccount: PublicKey,
        amount: BN
    },
    addOwner?: {
        user: PublicKey
    },
    changeProposalLifetime?: {
        duration: BN
    }
}
type Proposal = {
    wallet: PublicKey,
    proposer: PublicKey,
    proposal: ProposalType,
}
type VoteCount = {
    proposedTime: BN,
    votes: BN,
    voteRecord: [BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN,BN],
}
type WalletAuth = {
    owner: PublicKey,
    wallet: PublicKey,
    id: BN,
    addedTime: BN,
}
const programId = new PublicKey('HayWTxKiQxSMeUTPYtxPMmNbjTDfE4kvDP7hypkyLyAC')

export const WalletDetails: FC<Props> = ({ name, memberCount, m, n, proposalLifetime, members, address }) => {
    const [tokens, setTokens] = useState([])
    const { connection } = useConnection()
    const wallet = useWallet()
    const [tokenDetails, setTokenDetails] = useState({
        tokenAddress: '',
        amount: '',
    })
    const {tokenAddress, amount} = tokenDetails;
    const [transferDetails, setTransferDetails] = useState({
        sendMint: '',
        receiver: '',
        amount2: ''
    })
    const {sendMint, receiver, amount2} = transferDetails
    const [isOwner, setIsOwner] = useState(false)
    const [proposals, setProposals] = useState([{
        receiver: "receiver",
        tokenAddress: "tokenAddress",
        amount: 100,
        userVoted: true,
        executable: true,
        address: programId,
    },
        {
            receiver: "receiver",
            tokenAddress: "tokenAddress",
            amount: 100,
            userVoted: false,
            executable: false,
            address: programId,
        },
        {
            receiver: "receiver",
            tokenAddress: "tokenAddress",
            amount: 100,
            userVoted: false,
            executable: true,
            address: programId,
        },
        {
            receiver: "receiver",
            tokenAddress: "tokenAddress",
            amount: 100,
            userVoted: true,
            executable: false,
            address: programId,
        }
    ])

    useEffect(() => {
        const user = wallet.publicKey.toBase58()
        for (let i=0; i<members.length; ++i) {
            if (user === members[i]) {
                setIsOwner(true);
                return;
            }
        }
        setIsOwner(false);
    }, []);/*
    async function fetchProposals() {
        const discriminator = Buffer.from(sha256.digest("account:Proposal")).subarray(0, 8)
        // fetch all the proposal addresses using discriminator
        const proposalsMeta = await connection.getProgramAccounts(programId, {
            dataSlice: {
                offset: 0,
                length: 0
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
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
        const program = new Program(idl as Idl, programId, provider)
        // fetch all accounts using anchor
        let voteCounts: VoteCount[] = []
        let proposals: Proposal[] = []
        for (let i=0; i<proposalsMeta.length; ++i) {
            proposals.push(await program.account.proposal.fetch(proposalsMeta[i].pubkey) as Proposal)
            let [voteCountAddr] = PublicKey.findProgramAddressSync([Buffer.from("votes"), address.toBuffer(), proposalsMeta[i].pubkey.toBuffer()], programId)
            voteCounts.push(await program.account.voteCount.fetch(voteCountAddr) as VoteCount)
        }
        
        // initialize proposals
        let [walletAuthAddr] = PublicKey.findProgramAddressSync([Buffer.from("owner"), address.toBuffer(), wallet.publicKey.toBuffer()], programId)
        const walletAuth = await program.account.walletAuth.fetch(walletAuthAddr) as WalletAuth
        const bytePos = Number(walletAuth.id)/8
        const bitPos = Number(walletAuth.id)%8
        let proposalInfos: ProposalDetails[] = []
        let voted: boolean
        let executable: boolean
        let mintInfo: token.Mint
        for (let i=0; i<voteCounts.length; ++i) {
            voted = Number(voteCounts[i].voteRecord[bytePos]).toString(2).charAt(bitPos) === '1'
            executable = Number(voteCounts[i].votes) >= (memberCount*m)/n
            mintInfo = await token.getMint(connection, proposals[i].proposal.transfer.tokenMint)
            proposalInfos.push({
                receiver: proposals[i].proposal.transfer.receiveAccount.toBase58(),
                tokenAddress: proposals[i].proposal.transfer.tokenMint.toBase58(),
                amount: Number(proposals[i].proposal.transfer.amount)/(10**mintInfo.decimals),
                userVoted: voted,
                executable,
                address: proposalsMeta[i].pubkey,
                proposer: proposals[i].proposer
            })
        }
        setProposals(proposalInfos)
    }
    useEffect(()=> {
        fetchProposals()
    }, [])*/
    async function fetchTokens() {
        const [authority] = PublicKey.findProgramAddressSync([Buffer.from("authority"), address.toBuffer()], programId)
        const addresses = await connection.getProgramAccounts(token.TOKEN_PROGRAM_ID, {
            dataSlice: {
                offset: 0,
                length: 0,
            },
            filters: [
                {
                    dataSize: 165
                },
                {
                    memcmp: {
                        offset: 32,
                        bytes: authority.toBase58()
                    }
                }
            ]
        })
        let tokens: TokenDetails[] = []
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
    }, [])
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
    async function deposit(event) {/*
        event.preventDefault();
        // validate parameters
        if (tokenAddress===null || tokenAddress==='' || !isValidAddress(tokenAddress) || amount===null || amount==='' || Number(amount)===0) {
            notify({ type: 'error', message: `Invalid address or amount`, description: "please check your input" });
            return;
        }
        let mintInfo: token.Mint;
        try {
            mintInfo = await token.getMint(connection, new PublicKey(tokenAddress))
            const decimalsSpecified = amount.trim().split('.')[1].length
            if (decimalsSpecified > mintInfo.decimals) {
                notify({ type: 'error', message: `Too many decimals`, description: `specifed token only takes ${mintInfo.decimals} decimal places` });
                return;
            }
        } catch (error) {
            notify({ type: 'error', message: `Could not fetch mint info`, description: "address entered may not correspond to a mint" });
            return;
        }
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
        const program = new Program(idl as Idl, programId, provider)
        const instructions: TransactionInstruction[] = []
        // create ata if not exists
        const [authority] = PublicKey.findProgramAddressSync([Buffer.from("authority"), address.toBuffer()], programId)
        const walletAta = token.getAssociatedTokenAddressSync(new PublicKey(tokenAddress), authority, true)
        let selectedAccount: PublicKey
        try {
            const account = await token.getAccount(connection, walletAta)
        } catch (error) {
            instructions.push(
             await program.methods.createTokenAccount()
                           .accounts({
                                payer: wallet.publicKey,
                                wallet: address,
                                walletAuthority: authority,
                                mint: new PublicKey(tokenAddress),
                                account: walletAta
                           }).instruction())
        }
        // fetch token account containing atleast the balance specified
        try {
            const response = await connection.getTokenAccountsByOwner(wallet.publicKey, { mint: new PublicKey(tokenAddress ) })
            const tokenAccountInfos = response.value
            let tokenAccounts: token.Account[] = []
            for (let i=0; i<tokenAccountInfos.length; ++i) {
                tokenAccounts.push(await token.getAccount(connection, tokenAccountInfos[i].pubkey))
            }
            tokenAccounts = tokenAccounts.filter((account) => {
                return (Number(account.amount)/10**mintInfo.decimals) >= Number(amount)
            })
            if (tokenAccounts.length) {
                notify({ type: 'error', message: `Insufficient funds`, description: `user doesn't own any token account with atleast the specified amount of funds` });
                return;
            }
            selectedAccount = tokenAccounts[0].address
            const transferInstruction = token.createTransferInstruction(selectedAccount, walletAta, wallet.publicKey, Number(amount)*(10**mintInfo.decimals))
            instructions.push(transferInstruction)
        } catch (error) {
            notify({ type: 'error', message: `Could not fetch token accounts`, description: `${error}` });
            return;
        }
        
        // transfer tokens
        try {
            const recentBlockhash = await connection.getLatestBlockhash()
            const messageV0 = new TransactionMessage({
                payerKey: wallet.publicKey,
                recentBlockhash: recentBlockhash.blockhash,
                instructions
            }).compileToV0Message()
            const transaction = new VersionedTransaction(messageV0)
            wallet.signTransaction()
            transaction.sign([wallet])
        } catch (error) {
            notify({ type: 'error', message: `Could not transfer tokens`, description: `${error}` });
        }*/
    }
    function onChange(event) {
        const { name, value } = event.target;
        console.log("on change called")
        setTokenDetails({...tokenDetails, [name]: name === "amount" ? parseFloat(value) : value});
    }
    function onChange2(event) {
        const { name, value } = event.target;
        console.log("on change called")
        setTransferDetails({...transferDetails, [name]: name === "amount2" ? parseFloat(value) : value});
    }
    async function createProposal() {

    }
    async function vote(proposal: ProposalDetails) {
        // user, wallet, walletAuth, proposal, voteCount
        try {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
            const program = new Program(idl as Idl, programId, provider)
            const [walletAuth] = PublicKey.findProgramAddressSync([Buffer.from("owner"), address.toBuffer(), wallet.publicKey.toBuffer()], programId)
            const [voteCount] = PublicKey.findProgramAddressSync([Buffer.from("votes"), address.toBuffer(), proposal.address.toBuffer()], programId)
            await program.methods.vote()
                                 .accounts({
                                    user: wallet.publicKey,
                                    wallet: address,
                                    walletAuth,
                                    proposal: proposal.address,
                                    voteCount
                                 }).rpc()
        } catch (error) {
            notify({ type: 'error', message: `error sending txn`, description: `${error}` });
        }
        
    }
    async function revoke(proposal: ProposalDetails) {
        // user, wallet, walletAuth, proposal, voteCount
        try {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
            const program = new Program(idl as Idl, programId, provider)
            const [walletAuth] = PublicKey.findProgramAddressSync([Buffer.from("owner"), address.toBuffer(), wallet.publicKey.toBuffer()], programId)
            const [voteCount] = PublicKey.findProgramAddressSync([Buffer.from("votes"), address.toBuffer(), proposal.address.toBuffer()], programId)
            await program.methods.revokeVote()
                                 .accounts({
                                    user: wallet.publicKey,
                                    wallet: address,
                                    walletAuth,
                                    proposal: proposal.address,
                                    voteCount
                                 }).rpc()
        } catch (error) {
            notify({ type: 'error', message: `error sending txn`, description: `${error}` });
        }
    }
    /*
    async function execute(proposal: ProposalDetails) {
        // wallet, proposal, voteCount, proposer, sendAccount, receiveAccount, walletAuthority
        try {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
            const program = new Program(idl as Idl, programId, provider)
            const [voteCount] = PublicKey.findProgramAddressSync([Buffer.from("votes"), address.toBuffer(), proposal.address.toBuffer()], programId)
            await program.methods.close()
                                 .accounts({
                                    wallet: address,
                                    proposal: proposal.address,
                                    voteCount,
                                    proposer: proposal.proposer,
                                 })
        } catch (error) {
            
        }
        
    }*/
    return (
        <div>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt" ></div>
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
          <form onSubmit={deposit}>
            <input className="block" style={{marginBottom: 5, color: "black"}} type="text" name="tokenAddress" placeholder="Token Address" value={tokenAddress} onChange={onChange} />
            <input className="block" style={{marginBottom: 5, color: "black"}} type="number" name="amount" placeholder="Amount" value={amount} onChange={onChange} />
            <input className="block btn" type="submit" value={'Deposit'} />
          </form>
          {
            isOwner &&
            <Fragment>
                <form onSubmit={createProposal} style={{marginTop: 20}}>
                    <input className="block" style={{marginBottom: 5, color: "black"}} type="text" name="sendMint" placeholder="Token Address" value={sendMint} onChange={onChange2} />
                    <input className="block" style={{marginBottom: 5, color: "black"}} type="text" name="receiver" placeholder="Receiver Address" value={receiver} onChange={onChange2} />
                    <input className="block" style={{marginBottom: 5, color: "black"}} type="number" name="amount2" placeholder="Amount To Transfer" value={amount2} onChange={onChange2} />
                    <input className="block btn" type="submit" value={'Create Proposal'} />
                </form>
                {
                    proposals.map((proposal, index) => {
                        return <div key={index} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
                        <div className="max-w-md mx-auto bg-primary border-2 border-[#5252529f] p-6 px-10 my-2">
                        <p>{`Token: ${proposal.tokenAddress}`}</p>
                        <p>{`Receiver: ${proposal.receiver}`}</p>
                        <p>{`Amount: ${proposal.amount}`}</p>
                        {
                            proposal.userVoted? <button className="btn" onClick={()=>{revoke(proposal)}}>Revoke Vote</button>:<button className="btn" onClick={()=>{vote(proposal)}}>Vote</button>
                        }
                        {
                            proposal.executable && <button className="btn" style={{marginLeft: 5}} onClick={()=>{execute(proposal)}}>Execute</button>
                        }
                        </div>
                        </div>
                    })
                }
            </Fragment>
          }
          

        </div>
    );
};
