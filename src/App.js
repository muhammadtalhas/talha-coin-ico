import {
    EuiPage,
    EuiPageContent,
    EuiEmptyPrompt,
    EuiPageHeader,
    EuiPageBody,
    EuiButton,
    EuiProgress,
    EuiTitle,
    EuiHealth,
    EuiHeaderSectionItem,
    EuiHeaderLogo,
    EuiText,
    EuiCallOut,
    EuiSpacer,
    EuiModal,
    EuiModalHeader,
    EuiModalHeaderTitle,
    EuiForm,
    EuiModalFooter,
    EuiButtonEmpty,
    EuiModalBody,
    EuiFieldNumber,
    EuiTextColor,
    EuiIcon,
    EuiImage,
    EuiLink,
    EuiGlobalToastList,
    EuiBottomBar,
    EuiAccordion
} from '@elastic/eui';
import '@elastic/eui/dist/eui_theme_dark.css';

import React, {useEffect, useRef, useState} from "react";
import useWindowSize from "./hooks/useWindowSize";
import Confetti from 'confetti-react';
import "./styles.css";
import Coin from './TalhaCoinSpinning.gif'

const TalhaTokenSale_artifacts = require('./contracts/TalhaTokenSale.json');
const TalhaToken_artifacts = require('./contracts/TalhaToken.json');

const Web3 = require("web3");
let contract = require("@truffle/contract");
const etherConverter = require('ether-converter');

const tokensAvailable = 100;

function App() {
    const [web3Provider, setWeb3Provider] = useState(null);

    const TalhaTokenSaleContract = useRef(null);
    const TalhaTokenContract = useRef(null);

    const [network, setNetwork] = useState(null);
    const [account, setAccount] = useState(null);

    const [tokensOwned, setTokensOwned] = useState(null);

    const [tokenPrice, setTokenPrice] = useState(0);
    const [tokenSold, setTokenSold] = useState('');

    const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
    const [numberOfTokens, setNumberOfTokens] = useState(0);
    const [costInEther, setCostInEther] = useState(0);
    const [invalidQuantity, setInvalidQuantity] = useState(true);
    const [transacting, setTransacting] = useState(false);

    const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
    const [transactionHash, setTransactionHash] = useState(null);

    const [toasts, setToasts] = useState([]);


    const {width, height} = useWindowSize();

    const ethSetup = async () => {
        if (window.ethereum) {
            await window.ethereum.send('eth_requestAccounts');
            setWeb3Provider(new Web3(window.ethereum));
            setToasts(toasts.concat({
                title: 'Successfully connected to MetaMask!',
                color: 'success',
                text: <p>😎</p>,
            }));
            return true;
        }
        setToasts(toasts.concat({
            title: 'Could not connect to MetaMask',
            color: 'danger',
            text: <p>Make sure the MetaMask extension is installed and activated</p>,
        }));
        return false;
    };

    const purchaseFlow = async () => {
        let tokenSale;
        setTransacting(true);
        TalhaTokenSaleContract.current.deployed()
            .then(instance => {
                tokenSale = instance;
                /* Truffles autogas feature isnt working properly. Im not sure why.
                    Testing this flow on the rinkeyby test net shows that it takes 48,909 gas
                    im manually applying a max limit of 65000 because metamask was applying some crazy high value.
                    Since the ETH EVM is deterministic, the gas value will ALWAYS be 48909 but a buffer is still a good idea
                 */

                return tokenSale.buyTokens(numberOfTokens, {
                    from: account,
                    value: tokenPrice * numberOfTokens,
                    gasLimit: 85000
                });
            })
            .then(receipt => {
                console.log(receipt);
                loadStats();
                loadAccountStats();
                setIsPurchaseModalVisible(false);
                setTransactionHash(receipt.tx);
                setIsConfirmationModalVisible(true);
                setTransacting(false)
            })
            .catch(error => {
                console.log(error);
                setTransacting(false);
                setToasts(toasts.concat({
                    title: 'Could not complete the transaction',
                    color: 'danger',
                    text: <p>Make sure you have sufficient funds for the transaction</p>,
                }));
            })

    };

    const loadStats = () => {
        let tokenSale;
        TalhaTokenSaleContract.current.deployed()
            .then(instance => {
                tokenSale = instance;
                return tokenSale.tokenPrice();
            })
            .then(bn => {
                setTokenPrice(bn);
                return tokenSale.tokensSold();
            })
            .then(bn => {
                setTokenSold(bn);
            })
            .catch(e => {
                setToasts(toasts.concat({
                    title: 'Could not load ICO Statistics',
                    color: 'danger',
                    text: <p>Make sure you connect to the proper network on MetaMask</p>,
                }));
            })
    };

    const loadAccountStats = () => {
        let token;
        TalhaTokenContract.current.deployed()
            .then(instance => {
                token = instance;
                return token.balanceOf(account);
            })
            .then(bn => {
                setTokensOwned(bn);
            })
            .catch(e => {
                setToasts(toasts.concat({
                    title: 'Could not load Account Statistics',
                    color: 'danger',
                    text: <p>Make sure you connect to the proper network on MetaMask</p>,
                }));
            })
    };

    const removeToast = (removedToast) => {
        setToasts(toasts.filter((toast) => toast.id !== removedToast.id));
    };

    useEffect(() => {
        if (web3Provider) {
            const networkPromise = web3Provider.eth.net.getNetworkType();
            const accountsPromise = web3Provider.eth.getAccounts();

            Promise.all([networkPromise, accountsPromise]).then(values => {
                setNetwork(values[0]);
                setAccount(values[1][0]);
            });
            TalhaTokenContract.current.setProvider(web3Provider.currentProvider);
            TalhaTokenSaleContract.current.setProvider(web3Provider.currentProvider);
            TalhaTokenSaleContract.current.autoGas = true;
        }
    }, [web3Provider]);

    useEffect(() => {
        if (account) {
            loadAccountStats();
        }
    }, [account]);

    useEffect(() => {
        setCostInEther(etherConverter(tokenPrice * numberOfTokens, 'wei')['ether']);
        setInvalidQuantity(!Number.isInteger(Number(numberOfTokens)));
    }, [numberOfTokens, tokenPrice]);

    useEffect(() => {
        TalhaTokenSaleContract.current = contract(TalhaTokenSale_artifacts);
        TalhaTokenContract.current = contract(TalhaToken_artifacts);
    }, []);

    return (
        <div className="App">
            <EuiPage paddingSize="none">
                <EuiPageBody>
                    <EuiPageHeader>
                        <EuiHeaderSectionItem border="right">
                            <EuiHeaderLogo
                                iconType={() => <EuiIcon
                                    type="https://gist.githubusercontent.com/muhammadtalhas/2df2171acf0d4c72a787e480116de2ca/raw/666247dc49b58afdb02d373e2e81b7e2f8d88fb8/TalhaCoin.svg"
                                    size="xxl"/>}
                            >Talha Coin</EuiHeaderLogo>
                        </EuiHeaderSectionItem>
                        <EuiHeaderSectionItem border="right">
                            <EuiButton color={'secondary'}
                                       onClick={() => {
                                           ethSetup().then((success) => success ? loadStats() : null)
                                       }}
                                       iconType="link">
                                Connect to Metamask
                            </EuiButton>
                        </EuiHeaderSectionItem>
                    </EuiPageHeader>
                    <EuiCallOut
                        title="Proceed with caution!" color="warning" iconType="alert">
                        <EuiText textAlign="left">TALHA Coin does not entitle you to any products or services and will,
                            with absolute certainty, not hold any value in the ETH Token market. All Ethereum raised in
                            this ICO will be donated to <EuiLink href="https://cryptorelief.in/"
                                                                 target="_blank">cryptorelief.in</EuiLink>. You are
                            responsible for all gas fees. ty ilu.</EuiText>
                    </EuiCallOut>
                    <EuiPageContent
                        borderRadius="none"
                        hasShadow={true}
                        style={{display: 'flex'}}>
                        <EuiPageContent
                            paddingSize="none"
                            color="subdued"
                            hasShadow={false}>
                            <EuiEmptyPrompt title={<span>Talha Coin ICO</span>} body={
                                <>
                                    <EuiHealth
                                        color={web3Provider ? "success" : "danger"}>{web3Provider ? `Connected to the ${network} ETH Blockchain` : "Disconnected..."}</EuiHealth>
                                    <EuiTitle size="xxs">
                                        <h5>Number of Coins sold!</h5>
                                    </EuiTitle>
                                    <EuiProgress
                                        value={tokenSold}
                                        max={tokensAvailable}
                                        color={'primary'}
                                        size="l"
                                        valueText={<span>{`${tokenSold ? tokenSold : '-'}/${tokensAvailable}`}</span>}
                                    />
                                    {account ? <EuiText className="eui-xScrollWithShadows"
                                                        textAlign="center">{`Your Connected Wallet Address: ${account}`}</EuiText> : null}
                                    {tokensOwned ? <EuiText
                                        textAlign="center">{`You own ${tokensOwned} TALHA`}</EuiText> : null}
                                    <EuiSpacer/>
                                    <EuiButton
                                        disabled={!web3Provider}
                                        iconType="heart"
                                        onClick={() => setIsPurchaseModalVisible(true)}
                                    >Buy $TALHA!</EuiButton>
                                    <EuiSpacer/>
                                    <EuiImage
                                        alt='lol'
                                        src={Coin}
                                    />
                                </>
                            }/>
                            <EuiAccordion
                                id={0}
                                buttonContent="What is this?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p>This was my first end-to-end project to help me learn blockchain development.
                                        Everything you see here is hosted on my local server, and all backend
                                        communication happens with the live Ethereum Blockchain!</p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={1}
                                buttonContent="What is an ERC20 token?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p>An ERC20 token is a blockchain-based asset with similar functionality to bitcoin,
                                        ether, and bitcoin cash: it can hold value and be sent and received.
                                        The major difference between ERC20 tokens and other cryptocurrencies is that
                                        ERC20 tokens are created and hosted on the Ethereum blockchain, whereas bitcoin
                                        and bitcoin cash are the native currencies of their respective blockchains.
                                        ERC20 tokens are stored and sent using ethereum addresses and transactions, and
                                        use gas to cover transaction fees.</p>
                                    <p>Talha Coin is an implementation of the ERC20 standard and can be sent over the
                                        Ethereum network just like any <EuiLink href="https://etherscan.io/tokens"
                                                                                target="_blank"> other ERC20
                                            tokens</EuiLink></p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={2}
                                buttonContent="What is an ICO?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p>An initial coin offering (ICO) or initial currency offering is a type of funding
                                        using cryptocurrencies. It is often a form of crowdfunding. In an ICO, a
                                        quantity of cryptocurrency is sold in the form of "tokens" ("coins") to
                                        speculators or investors, in exchange for legal tender or other (generally
                                        established and more stable) cryptocurrencies such as Bitcoin or Ethereum. The
                                        tokens are promoted as future functional units of currency if or when the ICO's
                                        funding goal is met and the project successfully launches.</p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={3}
                                buttonContent="What is Metamask?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p><EuiLink href="https://metamask.io/" target="_blank">Check out their website here
                                        with a neat intro video</EuiLink></p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={4}
                                buttonContent="Where does the Ether I pay go?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p>The Ether is stored at the <EuiLink
                                        href="https://etherscan.io/address/0xe6049c65c847f24647dcaae110c0d3476addb075"
                                        target="_blank">this smart contract address</EuiLink> but
                                        will be transferred over to another account at the end of this test. I will then
                                        donate 100% of the Ether to the charity linked at the top of this page. Please
                                        not that the charity chosen may change. If you are buying this to support a
                                        charity, I urge you to donate directly. Once the funds are transferred, the
                                        transaction will be posted here for anyone to verify.</p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={5}
                                buttonContent="Where can I learn more about the technical aspect of this project?"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p><EuiLink href="https://github.com/muhammadtalhas/talha-coin" target="_blank">Source
                                        code is available here!</EuiLink></p>
                                    <p><EuiLink href="https://twitter.com/CaptainPandaz" target="_blank">Feel free to
                                        reach out to me on twitter</EuiLink></p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                            <EuiAccordion
                                id={6}
                                buttonContent="I want to get the full experience of this but I dont want to spend my real ether!"
                                paddingSize="l">
                                <EuiText size="s">
                                    <p>No problem! Talha Coin is also deployed on the Rinkeby Test Network where Ether is free and worthless!</p>
                                    <p>Configure your metamask chrome extension to connect to the Rinkeby Test Network and connect this application and you'll be routed to the test network ICO!</p>
                                    <p>If you need to add ether to your test account, try out <EuiLink href="https://faucet.rinkeby.io/" target="_blank">The Rinkeby Faucet</EuiLink></p>
                                </EuiText>
                            </EuiAccordion>
                            <EuiSpacer/>
                        </EuiPageContent>
                    </EuiPageContent>
                </EuiPageBody>
                {
                    isPurchaseModalVisible ?
                        <EuiModal onClose={() => transacting ? null : setIsPurchaseModalVisible(false)}>
                            {transacting ? <EuiProgress size="xs" color="accent" position="absolute"/> : null}
                            <EuiModalHeader>
                                <EuiModalHeaderTitle><h1>Purchase Order for Talha Coin</h1></EuiModalHeaderTitle>
                            </EuiModalHeader>
                            <EuiModalBody>
                                <EuiForm>
                                    <EuiFieldNumber
                                        value={numberOfTokens}
                                        step={0}
                                        isInvalid={invalidQuantity}
                                        onChange={(e) => {
                                            setNumberOfTokens(e.target.value)
                                        }}/>
                                    <EuiTitle>
                                        <h2>
                                            <EuiTextColor color="default">Estimated Cost: </EuiTextColor>
                                            <EuiTextColor
                                                color="secondary">{`~${numberOfTokens > 0 ? costInEther.toString() : "0"} Ether + Gas`} </EuiTextColor>
                                        </h2>
                                    </EuiTitle>
                                    <EuiTextColor size='s' color="default">Talha Coins are only available in whole units
                                        for this ICO </EuiTextColor>
                                </EuiForm>
                            </EuiModalBody>
                            <EuiModalFooter>
                                <EuiButtonEmpty
                                    onClick={() => purchaseFlow()}
                                    disabled={invalidQuantity || Number(numberOfTokens) === 0 || Number(numberOfTokens) < 0 || transacting}
                                    isLoading={transacting}
                                >Buy</EuiButtonEmpty>
                                <EuiButtonEmpty
                                    onClick={() => setIsPurchaseModalVisible(false)}
                                    disabled={transacting}
                                >Cancel</EuiButtonEmpty>
                            </EuiModalFooter>
                        </EuiModal> : null
                }
                {
                    transactionHash ?
                        <Confetti
                            numberOfPieces={20}
                            width={width}
                            height={height}
                        /> : null
                }
                {
                    isConfirmationModalVisible ?
                        <EuiModal onClose={() => setIsConfirmationModalVisible(false)}>
                            <EuiModalHeader>
                                <EuiModalHeaderTitle><h1>Congrats on becoming the proud owner of Talha Coin!</h1>
                                </EuiModalHeaderTitle>
                            </EuiModalHeader>
                            <EuiModalBody>
                                <EuiForm>
                                    <EuiTextColor size='s' color="default">Click <EuiLink
                                        href={`https://etherscan.io/tx/${transactionHash}`}
                                        target="_blank">here</EuiLink> to see the transaction on
                                        Etherscan!</EuiTextColor>
                                </EuiForm>
                            </EuiModalBody>
                        </EuiModal> : null
                }
            </EuiPage>
            <EuiGlobalToastList
                toasts={toasts}
                dismissToast={removeToast}
                toastLifeTimeMs={5000}/>
            <EuiBottomBar>
                <EuiText color="default">Token Address: <EuiLink
                    href={'https://etherscan.io/address/0x3dbc4E75ffCEeB080691b889523fB458D77318C2'}
                    target="_blank">0x3dbc4E75ffCEeB080691b889523fB458D77318C2</EuiLink></EuiText>
            </EuiBottomBar>
        </div>
    );
}

export default App;
