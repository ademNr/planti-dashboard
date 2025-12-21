import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturn extends Document {
    createdAt: Date;
    cost: number;
}

const ReturnSchema: Schema = new Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    cost: {
        type: Number,
        default: 3,
    },
});

// Check if the model is already defined to prevent overwriting during hot reloads
const Return: Model<IReturn> = mongoose.models.Return || mongoose.model<IReturn>('Return', ReturnSchema);

export default Return;
