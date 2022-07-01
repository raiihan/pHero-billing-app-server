const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function verifyJWToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: 'Unathorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: 'Forbidden Access' });
        }
        else {
            req.decoded = decoded;
            next();
        }
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tjmuq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        const billsCollection = client.db("billing-app").collection("bills");
        const usersCollection = client.db("billing-app").collection("users");

        app.post('/api/registration', async (req, res) => {
            const email = req.body.email;
            const password = await bcrypt.hash(req.body.password, 10);

            const userExist = await usersCollection.findOne({ email });
            if (userExist) {
                res.status(400).send({ message: 'User Already Exists' })
            }
            else {
                const result = await usersCollection.insertOne({ email, password })
                res.send(result)
            }

        })

        app.post('/api/login', async (req, res) => {
            const { email, password } = req.body;
            const user = await usersCollection.findOne({ email });
            const accessJWT = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_KEY, { expiresIn: '1d' });
            if (user) {
                if (await bcrypt.compare(password, user.password)) {
                    res.send({ user, accessJWT });
                }
                else {
                    res.status(400).send({ message: 'password does not match' })
                }
            }
            else {
                res.status(400).send({ message: 'Invalid Email' })
            }
            // console.log(user.password);
        })

        app.get('/billing-list', verifyJWToken, async (req, res) => {
            const page = parseInt(req.query.page);
            const count = parseInt(req.query.count);
            const search = req.query.search;
            const query = {}
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

                bills = await billsCollection.find(query).toArray()
            }
            res.send(bills)
        })

        app.get('/billing-list/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bill = await billsCollection.findOne(query);
            res.send(bill);
        })

        app.post('/add-billing', verifyJWToken, async (req, res) => {
            const bill = req.body
            const result = await billsCollection.insertOne(bill)
            res.send(result)
        })

        app.patch('/update-billing/:id', verifyJWToken, async (req, res) => {
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

        app.delete('/delete-billing/:id', verifyJWToken, async (req, res) => {
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