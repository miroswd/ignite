const express = require("express");
const { v4: uuidV4 } = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

// middleware
function verifyIfExistsAccountByCPF(request, response, next) {
  // next que define se o middleware vai pra frente ou para
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(404).json({ error: "Customer not found" });
  }

  // objeto que repassa o customer para as rotas que utilizarem esse middleware
  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.get("/statement/", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request; // recuperando o customer do middleware
  return response.status(200).json(customer.statement);
});

app.get("/statement/date", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00"); // pegando por dia, independente da hora

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

app.get("/account", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request;
  return response.status(200).json(customer);
});

app.get("/account/all", (request, response) => {
  return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);
  return response.status(200).json(balance);
});

app.post("/account", (request, response) => {
  const { name, cpf } = request.body;

  const customerExists = customers.some((customer) => customer.cpf === cpf);

  if (customerExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    id: uuidV4(),
    name,
    cpf,
    statement: [],
  });

  response.status(201).send();
});

app.post("/deposit", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);
  return response.status(201).json(statementOperation);
});

app.post("/withdraw", verifyIfExistsAccountByCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);
  if (amount > balance) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);
  return response.status(201).send();
});

app.put("/account", verifyIfExistsAccountByCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(200).send();
});

app.delete("/account", verifyIfExistsAccountByCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);
  return response.status(200).json(customers);
});

app.listen(3333, () => {
  console.log("Rodando");
});
