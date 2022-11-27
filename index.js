const express = require("express");
const cors = require("cors");
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.czp86h0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }); 


async function run(){
    try {
        const categoriesCollection = client.db("resellHub").collection("categories");
        const categoryProductsCollection = client.db("resellHub").collection("categoryProducts");
        const usersCollection = client.db('resellHub').collection('usersCollection');
        const bookingCollection = client.db('resellHub').collection('bookingsCollection');
    //     app.post('/jwt', (req, res) =>{
    //         const user = req.body;
    //         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    //         res.send({token}) 
    //     })

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }
        
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }

        app.get('/categories', async(req, res)=>{
            const query = {};
            const cursor = categoriesCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });
        
        app.get('/advertisesdItems', async(req, res)=>{
            const query = {};
            const cursor = categoryProductsCollection.find(query);
            const advertisedItems = await cursor.toArray();
            res.send(advertisedItems);
        });
        

        app.get('/categoryproducts/:id', async(req, res)=>{ 
            const id = req.params.id;
            const query = { id: id };
            const cursor =  categoryProductsCollection.find(query);
            const review = await cursor.toArray();
            res.send(review)
        });

        app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        
        app.get('/bookings', async (req, res) => {
            
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async(req, res)=>{
            const booking = req.body;
            const query = {
                email: booking.email,
                product: booking.product
            }
            console.log(query);

            const alreadyBooked = await bookingCollection.find(query).toArray();

            if (alreadyBooked.length){
                const message = `You have a booking already`
                return res.send({acknowledged: false, message})
            }

            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        });


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })

        // Buyers & sellers
        app.get('/users/:role',  async (req, res) => {
            const role = req.params.role;
            const query = { role }
            const cursor = usersCollection.find(query)
            const usersRole = await cursor.toArray()
            res.send(usersRole)
        })



        app.post('/addProduct', async(req, res)=>{
            const product = req.body;
            const result =  await categoryProductsCollection.insertOne(product);
            res.send(result);
        })


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            return res.send(result);
        })

        // app.put('/users/admin/:id', verifyJWT, verifyAdmin, async(req, res) =>{

        //     const id = req.params.id;
        //     const filter = { _id: ObjectId(id) }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin'
        //         }
        //     }
        //     const result = await usersCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);
        // })
       
        // app.get('/users/buyer/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const query = { email }
        //     const user = await usersCollection.findOne(query);
        //     res.send({ isBuyer: user?.role === 'Buyer' });
        // })
    
        
    } finally {
    // await client.close();
    }
}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Resell Hub Server is running')
});

app.listen(port, () =>{
    console.log(`Resell Hub server is running on port ${port}`);
})