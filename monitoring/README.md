# Production monitoring

The Checkly project monitors the public site without accounts, form submissions, customer data, or outbound messages.

It runs HTTP checks every five minutes and browser, DNS, and TLS checks every thirty minutes from Frankfurt (`eu-central-1`), Singapore (`ap-southeast-1`), and North Virginia (`us-east-1`). Checks retry once in the same region before alerting.

Set `CHECKLY_API_KEY` and `CHECKLY_ACCOUNT_ID` in the operator shell or CI secret store. They must never be committed. `CHECKLY_ALERT_EMAIL` is optional and defaults to the public owner address. Then run:

```sh
npm run monitoring:test
npm run monitoring:deploy
```

The deployment creates the email alert channel. Checkly may require the recipient to verify it once before delivery begins.
