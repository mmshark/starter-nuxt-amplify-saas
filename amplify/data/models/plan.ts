import { type ClientSchema, a } from '@aws-amplify/backend';

export const planModel = a
    .model({
      id: a.string().required(),
      name: a.string().required(), 
      description: a.string().required(),
      monthly_price: a.float().required(),
      yearly_price: a.float().required(),
      features: a.string().array(),
      isActive: a.boolean().required()
    })
