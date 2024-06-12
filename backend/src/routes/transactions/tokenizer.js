import express from 'express';
import getConnection from '../../../db.js';
import { isAdmin, verifyUser } from '../../middleware/authUser.js';
import midtrans from 'midtrans-client';

const router = express.Router();

router.post('/process-transaction', verifyUser, async (req, res) => {
    const conn = await getConnection();
    try {
        function generateUniqueOrderId() {
            const now = Date.now(); // Current timestamp in milliseconds
            const randomPart = Math.floor(1000 + Math.random() * 9000).toString(); // 4 random digits
            const orderId = (now % 100000000).toString() + randomPart; // Last 8 digits of timestamp + 4 random digits
            return orderId.substring(0, 8); // Ensure it’s an 8-digit number
        }
        
        // Generate the unique order ID
        const transactionId = generateUniqueOrderId();
        
        const snap = new midtrans.Snap({
            isProduction: false,
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY
        })
        const { cartItems, auth } = req.body;
        
        const parameter = {
            transaction_details: {
                order_id: transactionId.toString(),
                gross_amount: cartItems.cartTotalAmount
            },
            item_details: cartItems.cartItems.map(item => ({
                id: item.product_id.toString(),
                name: item.product_name,
                price: item.product_price,
                quantity: item.cartQuantity,
                brand: item.brand_name,
                category: item.category_name,
                merchant_name: "Trindo Jaya"
            })),
            customer_details: {
                first_name: auth.stateAuth.user_name,
                email: auth.stateAuth.user_email,
                phone: auth.stateAuth.user_phone,
                billing_address: {
                    first_name: auth.stateAuth.user_name,
                    email: auth.stateAuth.user_email,
                    phone: auth.stateAuth.user_phone,
                    address: auth.stateAuth.user_address,
                    country_code: "IDN"
                }
            },
            shipping_address: {
                first_name: auth.stateAuth.user_name,
                email: auth.stateAuth.user_email,
                phone: auth.stateAuth.user_phone,
                address: auth.stateAuth.user_address,
                country_code: "IDN"
            },
            enabled_payments: [
                "bni_va", "bri_va"
            ],
            bni_va: {
                va_number: "123123123123123"
            },
            bri_va: {
                va_number: "123123123123123"
            }
        };

        snap.createTransaction(parameter).then((transaction) => {
            const dataPayment = {
                response: JSON.stringify(transaction)
            };

            const token = transaction.token;
            res.status(200).json({ message: "success", dataPayment, token: token });
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            statusCode: 400,
            message: "There is an error : " + error
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
})

router.get('/transaction', verifyUser, isAdmin, async (req, res) => {
    const conn = await getConnection();
    try {
        const data = await conn.execute(`
        SELECT
        a.transaction_id,
        b.user_id,
        b.user_name,
        c.product_id,
        c.product_name,
        a.transaction_qty,
        a.transaction_price,
        a.transaction_total,
        a.transaction_date,
        a.transaction_status
        FROM transactions a INNER JOIN users b 
        ON a.user_id = b.user_id INNER JOIN products c
        ON a.product_id = c.product_id
        ORDER BY a.transaction_id`);
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(400).json({
            statusCode: 400,
            message: "There is an error : " + error
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
})

router.post('/transaction', verifyUser, isAdmin, async (req, res) => {
    const conn = await getConnection()

    try {
        const { transactionUser, transactionProd, transactionQty, transactionPrice, transactionTotal, transactionDate, transactionStatus } = req.body;
        if (!transactionUser || !transactionProd || !transactionQty || !transactionPrice || !transactionTotal || !transactionDate || !transactionStatus) return res.status(204).json({ msg: 'field kosong' });

        const data = await conn.execute(`INSERT INTO transactions VALUES(DEFAULT,?,?,?,?,?,?,?)`, [transactionUser, transactionProd, transactionQty, transactionPrice, transactionTotal, transactionDate, transactionStatus]);
        let statusCode = 200;
        let message = 'success';
        if (data[0] == 0) {
            statusCode = 400;
            message = 'gagal memasukan data transaction';
        }
        res.status(statusCode).json({
            statusCode,
            message,
        });

    } catch (e) {
        res.status(400).json({
            statusCode: 400,
            message: 'Error: ' + e,
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

router.put('/transaction/:id', verifyUser, isAdmin, async (req, res) => {
    const conn = await getConnection()
    try {
        const { transactionUser, transactionProd, transactionQty, transactionPrice, transactionTotal, transactionDate, transactionStatus } = req.body;
        const id = parseInt(req.params.id, 10);

        if (!transactionUser || !transactionProd || !transactionQty || !transactionPrice || !transactionTotal || !transactionDate || !transactionStatus) return res.status(204).json({ msg: 'field kosong' });


        const data = await conn.execute(`UPDATE transactions SET user_id =?, product_id=?, transaction_qty=?, transaction_price=?, transaction_total=?, transaction_date=?, transaction_status=? WHERE transaction_id = ?`,
            [transactionUser, transactionProd, transactionQty, transactionPrice, transactionTotal, transactionDate, transactionStatus, id]);
        let statusCode = 200;
        let message = 'success';
        if (data[0] == 0) {
            statusCode = 400;
            message = 'failed';
        }
        res.status(statusCode).json({
            statusCode,
            message,
        });

    } catch (e) {
        res.status(400).json({
            statusCode: 400,
            message: 'Have an error ' + e,
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
})

router.delete('/transaction/:id', verifyUser, isAdmin, async (req, res) => {
    const conn = await getConnection()
    try {
        const id = parseInt(req.params.id, 10);

        const data = await conn.execute(`DELETE FROM transactions WHERE transaction_id = ?`, [id])
        var statusCode = 200, message = 'success';
        if (data[0].affectedRows > 0) {
            const tableName = 'transaction';
            const columnName = 'transaction_id';
            const maxIdQuery = `SELECT COALESCE(MAX(${columnName}), 0) + 1 AS max_id FROM ${tableName}`;
            const [maxIdData] = await conn.execute(maxIdQuery);
            const maxId = maxIdData[0].max_id;

            const resetQuery = `ALTER TABLE ${tableName} AUTO_INCREMENT = ${maxId}`;
            await conn.execute(resetQuery);
        } else {
            statusCode = 400;
            message = 'failed';
        }
        res.status(statusCode).json({
            statusCode,
            message
        })

    } catch (e) {
        res.status(400).json({
            statusCode: 400,
            message: 'Have an error ' + e
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
})

export default router;

