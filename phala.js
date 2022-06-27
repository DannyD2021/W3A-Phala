/* eslint-disable no-await-in-loop */
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { signatureVerify } = require('@polkadot/util-crypto');
const { ContractPromise } = require('@polkadot/api-contract');
const { u8aToHex } = require('@polkadot/util');
const { create, types, signCertificate } = require('@phala/sdk');
const { khala } = require('@phala/typedefs');
require('dotenv').config({ path: `.env` });

const envs = process.env;
const config = {
    private_key: envs.PHALA_PRIVATE_KEY,
    phala_ws: envs.PHALA_WS,
    phala_http: envs.PHALA_HTTP,
    phala_contract: envs.PHALA_CONTRACT
};


const abi = require("./abi/aes.json");

class PhalaClient {
    constructor() {
        this.wsProvider = new WsProvider(config.phala_ws);
    }

    async init() {
        this.api = await ApiPromise.create({
            provider: this.wsProvider,
            types: {
                ...types,
                ...khala
            }
        });

        // get phala contract
        this.contract = await this.getContract();
        return this;
    }

    keyring() {
        const keyring = new Keyring({ type: 'sr25519' });
        return keyring.addFromUri(config.private_key);
    };

    /**
     * phala sign data vertify
     */
    vertify({ address, signature, data }) {
        const keyring = new Keyring({ type: 'sr25519' });
        const publicKey = keyring.decodeAddress(address);
        const message = typeof data === 'object' ? JSON.stringify(data) : data;
        const verification = signatureVerify(message, signature, publicKey);
        return verification.isValid;
    };

    /**
     * phala transaction signature
     */
    async signCertificate(keyring) {
        const data = await signCertificate({
            api: this.api,
            address: keyring.address,
            signer: {
                signRaw: ({ data }) => {
                    const signature = u8aToHex(keyring.sign(data));
                    return {
                        signature,
                    };
                },
            },
            signature_type: 1,
        });

        return data;
    };

    /**
     * phala contract instance
     */
    async getContract() {
        try {
            const apiPromise = await create({ api: this.api, baseURL: config.phala_http, contractId: config.phala_contract });
            const contract = new ContractPromise(
                apiPromise,
                abi,
                config.phala_contract
            );

            return contract;
        } catch (e) {
            console.error(`polkadot server init error: ${e}`);
        }
    };

    // make a new file sign by phala contract
    async newFile({ id }, callback) {
        const keyring = this.keyring();
        // call contract newFile method
        await this.contract.tx.newFile({}, id).signAndSend(keyring, (result) => callback(result));
    };

    // encrypt file
    async encryptFile({ id, ciphertext }) {
        const keyring = this.keyring();
        const sign_data = await this.signCertificate(keyring);
        const res = await this.contract.query.encryptFile(sign_data, {}, id, 0, ciphertext);
        return res.output.toJSON().ok;
    };

    // decrypt file
    async decryptFile({ id, ciphertext }) {
        const keyring = this.keyring();
        const sign_data = await this.signCertificate(keyring);
        const res = await this.contract.query.decryptFile(sign_data, {}, id, 0, ciphertext);
        return res.output.toJSON().ok;
    };

    // update file link
    async updateLink({ id, url }) {
        const keyring = this.keyring();
        await this.contract.tx.updateLink({}, id, url).signAndSend(keyring);
    };
}

module.exports = PhalaClient;