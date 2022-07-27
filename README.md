# How to Run

1. Install project dependencies
   1. `npm install`
2. Populate the data needed to run the code
   1. `cp dev.env .env`
3. Query Relay Chain Contribution
   1. `npm run fetch-relay <start block> <end block>`
4. Query Parallel Chain Contribution
   1. `npm run fetch-para <start block> <end block>`
5. Monitor Relay Chain Auctions
   1. `npm run process`