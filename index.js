const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tjmuq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        const billsCollection = client.db("billing-app").collection("bills");

        app.get('/billing-list', async (req, res) => {
            const page = parseInt(req.query.page);
            const count = parseInt(req.query.count);
            const search = req.query.search;
            let bills;
            if (page || count) {
                bills = (await (billsCollection.find({
                    "$or": [
                        { name: { $regex: search, $options: '$i' } },
                        { email: { $regex: search } },
                        { phone: { $regex: search } }
                    ]
                }).sort({ _id: -1 }).skip(page * count).limit(count).toArray()))
            }
            else {

                bills = await billsCollection.find({
                    "$or": [
                        { name: { $regex: search, $options: '$i' } },
                        { email: { $regex: search } },
                        { phone: { $regex: search } }
                    ]
                }).toArray()
            }
            res.send(bills)
        })

        app.get('/billing-list/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bill = await billsCollection.findOne(query);
            res.send(bill);
        })

        app.post('/add-billing', async (req, res) => {
            const bill = req.body
            console.log(bill);
            const result = await billsCollection.insertOne(bill)
            res.send(result)
        })

        app.patch('/update-billing/:id', async (req, res) => {
            const id = req.params.id;
            const bill = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: bill.name,
                    email: bill.email,
                    phone: bill.phone,
                    amount: bill.amount
                }
            }
            const updateBill = await billsCollection.updateOne(filter, updatedDoc);
            res.send(updateBill);
        })

        app.delete('/delete-billing/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await billsCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/totalbillcount', async (req, res) => {
            const count = await billsCollection.estimatedDocumentCount();
            res.send({ count })
        })
    } finally { }
}
run()



app.get('/', (req, res) => {
    res.send('Wellcome to the pHero Billing App')
})

app.listen(port, () => {
    console.log('Listening Port is', port);
})