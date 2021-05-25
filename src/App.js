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
    EuiBottomBar
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
                    gasLimit: 65000
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
