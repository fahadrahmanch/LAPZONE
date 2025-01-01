const posteditAddress = async (req, res) => {
  try {
    const data = req.body;
    console.log(data)
    const addressid = req.query.id
    const user = req.session.user;
    const findAddress = await Address.findOne({ 'address._id': addressid });

    if (!findAddress) {
      res.redirect('/pageNotFound')
    }
    await Address.updateOne({ 'address._id': addressid }, { $set: { 'address.$': {
       _id: addressid,
        addressType: data.addressType,
         name: data.name, 
         city: data.city, 
         landMark: data.landMark, 
         state: data.state,
         pinCode: data.pinCode,
         phone: data.phone, 
         altPhone: data.altPhone
           }
           } })
           res.redirect('/userProfile')

  } catch (error) {
 console.error('Error in edit address',error)
 res.redirect('/pageNotFound')
  }
}