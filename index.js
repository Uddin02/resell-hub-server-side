const express = require("express");
const cors = require("cors");
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.czp86h0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }); 


function verifyJWT(req, res, next){
    // console.log('inside',req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    });
}

async function run(){
    try {
        const categoriesCollection = client.db("resellHub").collection("categories");
        const categoryProductsCollection = client.db("resellHub").collection("categoryProducts");
        const usersCollection = client.db('resellHub').collection('usersCollection');
        const bookingCollection = client.db('resellHub').collection('bookingsCollection');


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
            const availability = req.query.status;
            const query = { status: availability };
            const bookings = await categoryProductsCollection.find(query).toArray();
            res.send(bookings);
        });
        

        app.get('/categoryproducts/:id', async(req, res)=>{ 
            const id = req.params.id;
            const query = { id: id };
            const cursor =  categoryProductsCollection.find(query);
            const review = await cursor.toArray();
            res.send(review)
        });

        // verifyJWT,
        
        app.get('/bookings', verifyJWT, async (req, res) => {            
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if( email !== decodedEmail ){
                return res.status(403).send({message: 'forbidden access'});
            }
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings',  async(req, res)=>{
            const booking = req.body;
            const query = {
                email: booking.email,
                product: booking.product
            }
            // console.log(query);

            const alreadyBooked = await bookingCollection.find(query).toArray();

            if (alreadyBooked.length){
                const message = `You have a booking already`
                return res.send({acknowledged: false, message})
            }

            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        });

        app.get('/jwt', async(req, res) =>{
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.status(403).send({accessToken: token})
            }
            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })

        app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })


        app.get('/users/admin/:email', verifyJWT, verifyAdmin,  async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        })

        app.get('/users/seller/:email', verifyJWT, verifySeller, async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })

        // Buyers & sellers
        app.get('/users/:role', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.params.role;
            const query = { role }
            const cursor = usersCollection.find(query)
            const usersRole = await cursor.toArray()
            res.send(usersRole)
        })



        app.post('/addProduct', verifyJWT, verifySeller, async(req, res)=>{
            const product = req.body;
            const result =  await categoryProductsCollection.insertOne(product);
            res.send(result);
        })
        
        //specific seller products api
        app.get('/myProducts', verifyJWT, async(req, res)=>{
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if( email !== decodedEmail ){
                return res.status(403).send({message: 'forbidden access'});
            }
            const query = { seller_email: email };
            const cursor = categoryProductsCollection.find(query);
            const advertisedItems = await cursor.toArray();
            res.send(advertisedItems);
        });

        app.put('/myProduct/:id', async(req, res)=>{
            const id = req.params.id;
            const status = req.body.status;
            // console.log(status);
            const query = {_id: ObjectId(id)};
            const updateDoc = {
                $set: {
                  status: status
                },
              };
            
            const result = await categoryProductsCollection.updateOne(query, updateDoc);
            res.send(result);
        })
       
        
        app.delete('/myProducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await categoryProductsCollection.deleteOne(filter);
            return res.send(result);
        })


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            return res.send(result);
        })
        
      

    
        
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