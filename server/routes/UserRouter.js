/*UserRouter.js: defines routes and validation conditions according to the project specification*/

//initializing and calling modules
const router = require("express").Router();
const User = require("../models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { auth } = require("../middlewares/auth.js");

//defining routes 
//Register new user
router.post("/register", async (req, res)=> {
    const {name, email, password} = req.body;
    
    //check all required fields
    if (!name || !email || !password) 
        return res.status(400).json({message:"All fields are required."} );

    //validate email address
    const validateEmail = (email) => {
        return String(email)
        .toLowerCase().match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    if (!validateEmail(email))
        return res.status(400).json({message: "email not valid"});

    //validate password
    const validatePassword = (password) => {
        return String(password).match(
            /^(?=.*[0-9])/
        );
    };
    if (password.length < 5 || !validatePassword(password))
        return res.status(400).json({message: "password must be at least five characters long with at least one numerical character "});
    
    try {
        //check for registered users
        const { name, email, password, role, isBlocked } = req.body;
        const found = await User.findOne({ email });
        if (found) {
            return res.status(401).json({ message: `${email}: already registered! `});
        }
        //hashing password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            isBlocked,
        }); 
        res.status(200).json(newUser);
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
});

//Users login
router.post("/login", async (req, res)=> {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "please fill the required fields!" });

    //validate email address
    const validateEmail = (email) => {
        return String(email)
        .toLowerCase().match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };
    if (!validateEmail(email))
        return res.status(400).json({message: "invalid email or password"});
    try {
        //check for registered users
        const userFound = await User.findOne({ email });
        if (!userFound) {
            return res.status(401).json({ message: "invalid email or password."});
        }
        // if user found
        const passwordMatch = await bcrypt.compare(
            password,
            userFound.password
        );
        //check for password
        if (!passwordMatch)
            return res.status(400).json({ error: "invalid email or password!" });
        //matching ID and generating a protected token
        const payload = { _id: userFound._id };
        const token = jwt.sign(payload, process.env.SECRET, {
        expiresIn: "1d",
        });
        res.status(200).json({token, userFound});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
} );
//Getting all users list for admin profile
router.get("/users", auth, async (req, res) => {
    if(req.user.role === "admin"){
        try {
            const users = await User.find();
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: error });
        }
    } else {
        return res.status(400).json({ error: "Not authorized!" })
    }
    
});

module.exports = router;
