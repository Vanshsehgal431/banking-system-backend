import pool from "../src/config/database.js";

const TOTAL_ACCOUNTS = 150000;
let BATCH_SIZE = 15000;
let TOTAL_TRANSACTIONS = 3000000;
const accounts = new Set();

const ACCOUNT_TYPES = ["SAVINGS", "CURRENT"];

const accounts_array = [];

function generate_accounts() {
  while (accounts.size < TOTAL_ACCOUNTS) {
    const randomNum = Math.floor(
      10000000000 + Math.random() * 900000000000,
    ).toString();

    accounts.add(randomNum);
  }
}
generate_accounts();
async function add_accounts() {
  const connection = await pool.getConnection();

  try {
    for (let i = 0; i < TOTAL_ACCOUNTS; i += BATCH_SIZE) {
      const values = [];
      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_ACCOUNTS - i);

      for (let j = 0; j < currentBatchSize; j++) {
        const user_id = Math.floor(Math.random() * 50000) + 1;
        const account_type =
          ACCOUNT_TYPES[Math.floor(Math.random() * ACCOUNT_TYPES.length)];
        const account_number = accounts.values().next().value;
        accounts_array.push(account_number);
        accounts.delete(account_number);

        values.push([user_id, account_number, account_type]);
      }

      await connection.query(
        `INSERT INTO accounts
        (user_id, account_number, account_type) VALUES ?
        `,
        [values],
      );

      console.log(
        `Inserted ${Math.min(i + BATCH_SIZE, TOTAL_ACCOUNTS)} / ${TOTAL_ACCOUNTS}`,
      );
    }
    console.log("150,000 accounts inserted successfully.");
  } catch (error) {
    console.log(error);
  } finally {
    connection.release();
  }
}

TOTAL_TRANSACTIONS = 3000000;
let TRANSACTION_BATCH_SIZE = 10000;

const TRANSACTION_TYPES = ["TRANSFER", "DEPOSIT", "WITHDRAW"];
const STATUS = ["SUCCESS", "FAILED"];

function randomAmount() {
  return (Math.random() * 50000 + 100).toFixed(2);
}

async function add_transactions() {
  const connection = await pool.getConnection();

  try {
    for (let i = 0; i < TOTAL_TRANSACTIONS; i += TRANSACTION_BATCH_SIZE) {
      const values = [];
      const batchSize = Math.min(
        TRANSACTION_BATCH_SIZE,
        TOTAL_TRANSACTIONS - i,
      );

      for (let j = 0; j < batchSize; j++) {
        const type =
          TRANSACTION_TYPES[
            Math.floor(Math.random() * TRANSACTION_TYPES.length)
          ];

        const status = Math.random() < 0.95 ? "SUCCESS" : "FAILED";

        const amount = randomAmount();

        let sender = null;
        let receiver = null;

        if (type === "TRANSFER") {
          let senderIndex = Math.floor(Math.random() * accounts_array.length);
          let receiverIndex = Math.floor(Math.random() * accounts_array.length);

          while (receiverIndex === senderIndex) {
            receiverIndex = Math.floor(Math.random() * accounts_array.length);
          }

          sender = accounts_array[senderIndex];
          receiver = accounts_array[receiverIndex];
        }

        if (type === "DEPOSIT") {
          receiver =
            accounts_array[Math.floor(Math.random() * accounts_array.length)];
        }

        if (type === "WITHDRAW") {
          sender =
            accounts_array[Math.floor(Math.random() * accounts_array.length)];
        }

        values.push([sender, receiver, amount, status, type]);
      }

      await connection.query(
        `INSERT INTO transactions
        (sender_account_number,
         receiver_account_number,
         amount,
         status,
         transaction_type)
         VALUES ?`,
        [values],
      );

      console.log(
        `Inserted ${Math.min(
          i + TRANSACTION_BATCH_SIZE,
          TOTAL_TRANSACTIONS,
        )} / ${TOTAL_TRANSACTIONS}`,
      );
    }

    console.log("3,000,000 transactions inserted successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    connection.release();
  }
}

// Call after accounts have been inserted
await add_accounts();
await add_transactions();
