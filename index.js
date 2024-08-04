const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://zefe-frpdoors-adminpanel.vercel.app",
  "https://ananddivine-zefe-frpdoors-frontend.vercel.app"
  ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
}));


app.use(express.json());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb+srv://ad91482948:ananddivine@cluster0.kni9rs9.mongodb.net/ZEFEFRPDOORS", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");

  // Drop the index if it exists
  try {
    await mongoose.connection.db.collection('users').dropIndex('image_1');
    console.log("Index 'image_1' dropped successfully");
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log("Index 'image_1' not found");
    } else {
      console.log("Error dropping index:", err.message);
    }
  }

  // Start the server after dropping the index
  startServer();
}).catch(err => {
  console.log("Error connecting to MongoDB:", err.message);
});

const startServer = () => {
  const port = 4000;

  // API creation
  app.use('/images', express.static('upload/images'));
  app.get("/", (req, res) => {
    res.send("Express App is Running");
  });

  // Image Storage Engine
  const Storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
      return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({ storage: Storage });

  // Creating upload image
  app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    res.json({
      success: 1,
      Image_url:`https://zefefrpdoors-backend.onrender.com/images/${req.file.filename}`
    });
  });

  // Schema for creating product
  const Product = mongoose.model("Product", {
    id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    new_price: {
      type: Number,
      required: true,
    },
    old_price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    available: {
      type: Boolean,
      default: true,
    },
  });

  app.post('/addproduct', async (req, res) => {
    try {
      let products = await Product.find({});
      let id;

      if (products.length > 0) {
        let last_product = products[products.length - 1];
        id = last_product.id + 1;
      } else {
        id = 1;
      }

      const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
        description: req.body.description,
      });

      console.log(product);
      await product.save();
      console.log("saved");

      res.json({
        success: true,
        name: req.body.name,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Creating API for deleting the product
  app.post('/removeproduct', async (req, res) => {
    try {
      const product = await Product.findOneAndDelete({ id: req.body.id });
      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      console.log("Removed:", product);
      res.json({
        success: true,
        name: req.body.name,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Creating API for getting all products
  app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All products fetched");
    res.send(products);
  });

  // Schema for creating user model
  const User = mongoose.model('User', {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    cartData: {
      type: Object,
    },
    date: {
      type: Date,
      default: Date.now,
    }
  });

  // Creating endpoint for the registration of users
  app.post('/signup', async (req, res) => {
    try {
      let check = await User.findOne({ email: req.body.email });
      if (check) {
        return res.status(400).json({ success: false, error: "Existing User Found" });
      }

      let cart = {};
      for (let i = 0; i < 300; i++) {
        cart[i] = 0;
      }

      const user = new User({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
      });

      await user.save();

      const data = {
        user: {
          id: user.id
        }
      };

      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, token });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
          const data = {
            user: {
              id: user.id
            }
          }
          const token = jwt.sign(data, 'secret_ecom');
          res.json({ success: true, token });
        } else {
          res.json({ success: false, errors: "Wrong password" });
        }
      } else {
        res.json({ success: false, errors: "Wrong email id " });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Creating endpoint for newcollection data
  app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New collection fetched");
    res.send(newcollection);
  });

  // Creating endpoint for newcollection data
  app.get('/populerinshop', async (req, res) => {
    let products = await Product.find({});
    let populer_in_shop = products.slice(0, 4);
    console.log("populerinshopfetched");
    res.send(populer_in_shop);
  });

  // Creating Middleware to fetch user
  const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
      res.status(401).send({ error: "Please authenticate using a valid token" });
    } else {
      try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
      } catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
      }
    }
  };

  // Adding product to cart
  app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Add", req.body.item);
    try {
      let userData = await User.findOne({ _id: req.user.id });
      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      userData.cartData[req.body.item] += 1;
      await User.updateOne({ _id: req.user.id }, { $set: userData });
      res.json({ success: true });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Decrease product quantity in cart
  app.post('/removecartitem', fetchUser, async (req, res) => {
    console.log("Remove", req.body.item);
    try {
      let userData = await User.findOne({ _id: req.user.id });
      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (userData.cartData[req.body.item] > 0) {
        userData.cartData[req.body.item] -= 1;
      }
      await User.updateOne({ _id: req.user.id }, { $set: userData });
      res.json({ success: true });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Fetch cart data
  app.get('/fetchcart', fetchUser, async (req, res) => {
    let userData = await User.findOne({ _id: req.user.id });
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.send(userData.cartData);
  });


// creating endpoin to get  cartData

app.post('/getcart',fetchUser,async (req,res)=>{
  console.log("GetCart");
  let userData = await User.findOne({_id:req.user.id});
  res.json(userData.cartData);
});




// Fetch user details endpoint
app.get('/user-details', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email'); // Fetch only name and email
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});





  // Start the server
  app.listen(port, (error) => {
    if (!error) {
      console.log("Server Running on Port " + port);
    } else {
      console.log("Error: " + error);
    }
  });
};
