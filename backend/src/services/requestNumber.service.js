import Sequence from "../models/Sequence.model.js";

const REQUEST_SEQUENCE_KEY = "ad-request";

export const formatRequestNumber = (value) => `REQ-${String(value).padStart(6, "0")}`;

export const getNextRequestNumber = async (agencyId, sequenceModel = Sequence) => {
  let sequence;
  try {
    sequence = await sequenceModel.findOneAndUpdate(
      { agency: agencyId, key: REQUEST_SEQUENCE_KEY },
      { $inc: { value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    sequence = await sequenceModel.findOneAndUpdate(
      { agency: agencyId, key: REQUEST_SEQUENCE_KEY },
      { $inc: { value: 1 } },
      { new: true }
    );
  }

  return formatRequestNumber(sequence.value);
};
