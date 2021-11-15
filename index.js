const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;

// 


const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//middleware 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c1i4y.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;




async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db('electricCars');
        const servicesCollection = database.collection('cars');
        const usersCollection = database.collection('users');
        const ordersCollection = database.collection('orders');
        const reviewCollection = database.collection('reviews');

        //post api
        app.post('/cars', async (req, res) => {
            const car = req.body;
            const result = await servicesCollection.insertOne(car);
            res.json(result);
        });
        //get api
        app.get('/cars', async (req, res) => {
            const cursor = servicesCollection.find({});
            const cars = await cursor.toArray();
            res.send(cars);
        })
        // get single api 
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            console.log('getting a car', id);
            const query = { _id: ObjectId(id) };
            const car = await servicesCollection.findOne(query);
            res.json(car);
        })

        // delete service 
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.deleteOne(query);
            res.json(result);
        })
        //update service
        app.put('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const change = req.headers.status;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateStatus = {
                $set: {
                    status: change
                }
            };
            const result = await servicesCollection.updateOne(filter, updateStatus, options);
            res.json(result);
        })
        //login/signup
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
        //add user api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result)
        });
        //GET users
        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.send(users);
        })
        //upsert user
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        //admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: "Don't have access" });
            }

        })
        //get orders
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        })

        //add orders
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        })
        //delete orders 
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })
        //update orders
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const change = req.headers.status;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateStatus = {
                $set: {
                    status: change
                }
            };
            const result = await ordersCollection.updateOne(filter, updateStatus, options);
            res.json(result);
        })

        // review 
        //get reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        //add reviews
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.json(result);
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Electric Boom shop')
})

app.listen(port, () => {
    console.log(`Electro boom listening at http://localhost:${port}`)
})