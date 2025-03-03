const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: false
    },
    totalBalance:{
        type:Number,
        required:false,
        default:0
    },
    createdOn: {
        type: String,
        default: () => {
            const now = new Date();
            
            return now.toISOString().split('T')[0]; // Get the date part only
        },
        required: true,
    },
    transactions: [
        {
            type: {
                type: String,
                enum: ['Deposit', 'Withdrawal', 'Purchase', 'Refund', 'Referal'],
                required: false
            },
            amount: {
                type: Number,
                required: false
            },
            orderId: {
                type: String,
                ref: 'Order',
                required: function() {
                    return this.type === 'Purchase' || this.type === 'Refund';
                }
            },
            status: {
                type: String,
                enum: ['Completed', 'Failed', 'Pending'],
                default: 'Completed'
            },
            description: {
                type: String,
                required: false
            },
            date: {
                type: String,
                default: () => {
                    const now = new Date();
                    
                    return String.toISOString().split('T')[0]; // Get the date part only
                },             
                   required: true,
            }
            
            
            
        }
    ],
},{timestamps:true});
// walletSchema.pre('save', function (next) {
//     this.lastUpdated = Date.now();
//     next();
// });

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;