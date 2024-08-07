import { MongoClient, ObjectId, CollectionInfo } from "mongodb";
import { JSONValue } from "@hasura/ndc-lambda-sdk"
import dotenv from "dotenv";

dotenv.config();


/**
 * @param commentData An object containing the comment's data.
 * @returns The ID of the newly inserted comment.
 */
export async function insertComment(commentData: {
  name: string;
  email: string;
  movie_id: string;
  text: string;
  date: string;
}): Promise<string> {
  const client = new MongoClient(process.env.CONNECTION_URI!, {

  });

  try {
    await client.connect();
    const database = client.db("sample_mflix"); // Replace with your database name
    const collection = database.collection("comments");

    const result = await collection.insertOne({
      name: commentData.name,
      email: commentData.email,
      movie_id: new ObjectId(commentData.movie_id),
      text: commentData.text,
      date: new Date(commentData.date),
    });
    if (result.insertedId) {
      return result.insertedId.toString();
    } else {
      throw new Error("Failed to insert comment");
    }
  } catch (err: any) {
    console.error('Error inserting comment:', err);
    console.error('Error code:', err.code);
    console.error('Error details:', JSON.stringify(err.errInfo.details, null, 2));
    throw new Error('Error inserting comment');
  } finally {
    await client.close();
  }
}


interface CollectionInfoWithOptions extends CollectionInfo {
  options?: {
    validator?: {
      $jsonSchema?: object;
    };
  };
}


/**
 * @param collection The collection to get the validation schema for.
 * @readonly Exposes the function as an NDC function (the function should only query data without making modifications)
 * @returns The validation schema for a collection.
 */
export async function getValidationSchema(collection: string): Promise<JSONValue> {
  const client = new MongoClient(process.env.CONNECTION_URI!, {});

  try {
    await client.connect();
    const database = client.db("sample_mflix"); // Replace with your database name

    const collections = await database.listCollections({ name: collection }).toArray();
    if (collections.length > 0) {
      const collectionInfo = collections[0] as CollectionInfoWithOptions;
      const validationSchema = collectionInfo.options?.validator;
      if (validationSchema) {
        console.log("Validation Schema:", JSON.stringify(validationSchema, null, 2));
        return new JSONValue(validationSchema);
      } else {
        console.log("No validation schema found for the collection.");
        return new JSONValue({ message: "No validation schema found for the collection." });
      }
    } else {
      console.log("Collection not found.");
      return new JSONValue({ message: "Collection not found." });
    }
  } catch (error) {
    console.error("Error fetching validation schema:", error);
    return new JSONValue({ error: "Error fetching validation schema.", details: error });
  } finally {
    await client.close();
  }
}


/**
 * @param collection The name of the collection to insert the data into.
 * @param formData An object containing the form data to be inserted.
 * @returns The ID of the newly inserted document.
 */
export async function insertFormData(collection: string, formData: string): Promise<JSONValue> {
  const client = new MongoClient(process.env.CONNECTION_URI!, {});

  try {
    await client.connect();
    const database = client.db("sample_mflix"); // Replace with your database name
    const coll = database.collection(collection);
    const data = JSON.parse(formData);

    // Convert specific fields to ObjectId or Date if they are strings
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (isValidObjectId(data[key])) {
          data[key] = new ObjectId(data[key]);
        } else if (isValidDate(data[key])) {
          data[key] = new Date(data[key]);
        }
      }
    }

    // Insert the form data into the collection
    const result = await coll.insertOne(data);
    console.log("formData");
    console.log(formData);
    if (result.insertedId) {
      return new JSONValue({ _id: result.insertedId.toString() });
    } else {
      throw new Error("Failed to insert data");
    }
  } catch (err: any) {
    console.error('Error inserting data:', err);
    console.error('Error code:', err.code);
    console.error('Error details:', JSON.stringify(err.errInfo?.details, null, 2));
    return new JSONValue({ error: err.errInfo?.details });
  } finally {
    await client.close();
  }
}

/**
 * Checks if a value is a valid ObjectId string.
 * @param value The value to check.
 * @returns True if the value is a valid ObjectId string, false otherwise.
 */
function isValidObjectId(value: any): boolean {
  return ObjectId.isValid(value) && String(new ObjectId(value)) === value;
}

/**
 * Checks if a value is a valid date string.
 * @param value The value to check.
 * @returns True if the value is a valid date string, false otherwise.
 */
function isValidDate(value: any): boolean {
  return !isNaN(Date.parse(value));
}
