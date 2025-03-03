const userSchema = require("../../models/userSchema");
const bcrypt = require("bcrypt");

// LOGIN PAGE RENDER
const loadlogin = async (req, res) => {
  try {
    const message = req.session.error || null;
    req.session.error = null;
    await res.render("admin/adminlogin", { message });
  } catch (error) {
    console.log(error);
  }
};

// POST LOGIN

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await userSchema.findOne({ email, isAdmin: true });

    req.session.error = "Invalid credentials";
    if (!admin) return res.redirect("/admin/login");
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.redirect("/admin/login");
    req.session.error = "";
    req.session.admin = true;
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.log(error);
  }
};

//LOGOUT

const isLogout = async (req, res) => {
  req.session.admin = false;
  res.redirect("/admin/login");
};

module.exports = { loadlogin, login, isLogout };
