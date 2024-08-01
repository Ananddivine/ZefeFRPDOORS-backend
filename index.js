const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const port = 4000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/images', express.static(path.join(__dirname, 'upload/images')));

// Connect to MongoDB
mongoose.connect("mongodb+srv://ad91482948:ananddivine@cluster0.kni9rs9.mongodb.net/ZEFEFRPDOORS", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");

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

  startServer();
}).catch(err => {
  console.log("Error connecting to MongoDB:", err.message);
});

const startServer = () => {
  // Image Storage Engine
  const Storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
      return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({ storage: Storage });

  // API Endpoints
  app.get("/", (req, res) => {
    res.send("Express App is Running");
  });

  // Upload image
  app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    res.json({
      success: true,
      Image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
  });

  // Product Schema
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
    date: {
      type: Date,
      default: Date.now,
    },
    available: {
      type: Boolean,
      default: true,
    },
  });

  // Add product
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
      });

      await product.save();

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

  // Remove product
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

  // Get all products
  app.get('/allproducts', async (req, res) => {
    try {
      let products = await Product.find({});
      res.send(products);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // User Schema
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

  // User signup
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

  // User login
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
        res.json({ success: false, errors: "Wrong email id" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Get new collections
  app.get('/newcollections', async (req, res) => {
    try {
      let products = await Product.find({});
      let newcollection = products.slice(1).slice(-8);
      res.send(newcollection);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Get popular in shop
  app.get('/populerinshop', async (req, res) => {
    try {
      let products = await Product.find({});
      let populer_in_shop = products.slice(0, 4);
      res.send(populer_in_shop);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  });

  // Middleware to fetch user
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

  // Add to cart
  app.post('/addtocart', fetchUser, async (req, res) => {
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

  // Remove item from cart
  app.post('/removecartitem', fetchUser, async (req, res) => {
    try {
      let userData = await User.findOne({ _id: req.user.id });
      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      userData.cartData[req.body.item] -= 1;
      if (userData.cartData[req.body.item] < 0) {
        userData.cartData[req.body.item] = 0;
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

  // Get cart items
  app.get('/getcart', fetchUser, async (req, res) => {
    try {
      let userData = await User.findOne({ _id: req.user.id });
      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json(userData.cartData);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
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
