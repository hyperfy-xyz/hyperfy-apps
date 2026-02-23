const DEBUG = true;
const log = (...args) => DEBUG && console.log(...args);

const DEFAULT_AMOUNT = 5;
// const TOKEN = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" //USDC
const TOKEN = "8vBMibwpn8wpfYKbQ9xqzodymg3LjmYec2tSNGRy23K8"; // HYPER
// const decimals = 6;
let SERVER_WALLET;

let mode;
const setMode = (fn) => {
  log('Setting mode:', fn.name);
  mode?.();
  mode = fn();
};

if (world.isServer) {
  log('Server initialized');
  const players = new Map(); //nid<{pid, wallet, balance}>

  async function getServerBalance() {
    log('Fetching server balance');
    if (!app.solana?.connection) {
      log('No Solana connection for server balance');
      return null;
    }
    // const { token } = app.solana.programs;
    try {
      const token = await app.solana.programs.token(TOKEN)
      const balance = await token.balance(app.solana.wallet.publicKey);
      log('Server balance fetched:', balance);
      app.send("server:wallet", {
        serverWallet: app.solana.wallet.publicKey,
        serverBalance: balance.balance || 0,
        decimals: token.decimals,
        supply: token.supply,
        name: token.name,
        symbol: token.symbol,
        uri: token.uri,
      });
      return { balance, decimals: token };
    } catch (error) {
      console.error("Failed to fetch server balance:", error);
      return null;
    }
  }

  // Helper function to find network ID by player ID or wallet
  function findPlayerNid(identifier) {
    for (const [nid, data] of players.entries()) {
      if (data.pid === identifier || data.wallet.toString() === identifier.toString()) {
        return nid;
      }
    }
    return null;
  }

  function updatePlayerBalance(nid, newBalance) {
    const player = players.get(nid);
    if (player) {
      player.balance = newBalance;
      app.sendTo(nid, "server:balance:update", newBalance);
      log('Updated balance for player:', { nid, newBalance });
    }
  }

  // app.emit("token:increment_balance_nid", collector)
  world.on("token:increment_balance_nid", nid => {
    console.log('got collecting!', nid)
    if (nid) {
      const player = players.get(nid);
      const newBalance = player.balance + 1;
      updatePlayerBalance(nid, newBalance);
      log('Balance added via external request:', { nid, amount, newBalance });
    } else {
      console.error('Player not found for balance addition:', nid);
    }
  })

  world.on("token:add_balance", (data) => {
    const { identifier, amount } = data;
    const nid = findPlayerNid(identifier);

    if (nid) {
      const player = players.get(nid);
      const newBalance = player.balance + amount;
      updatePlayerBalance(nid, newBalance);
      log('Balance added via external request:', { identifier, amount, newBalance });
    } else {
      console.error('Player not found for balance addition:', identifier);
    }
  });

  world.on("token:set_balance", (data) => {
    const { identifier, balance } = data;
    const nid = findPlayerNid(identifier);

    if (nid) {
      updatePlayerBalance(nid, balance);
      log('Balance set via external request:', { identifier, balance });
    } else {
      console.error('Player not found for balance set:', identifier);
    }
  });

  world.on("token:remove_balance", (data) => {
    log('removing balance?', data)
    const { identifier, amount } = data;
    const nid = findPlayerNid(identifier);

    if (nid) {
      const player = players.get(nid);
      const newBalance = Math.max(0, player.balance - amount);
      updatePlayerBalance(nid, newBalance);
      log('Balance removed via external request:', { identifier, amount, newBalance });
    } else {
      console.error('Player not found for balance removal:', identifier);
    }
  });

  app.on("client:deposit", async ([amount, wallet], nid) => {
    log('Deposit notification received:', { amount, wallet, nid });
    const player = players.get(nid);

    if (player) {
      const newBalance = player.balance + amount;
      updatePlayerBalance(nid, newBalance);
      // Broadcast deposit event to other server scripts
      app.emit("token:player_deposit", {
        playerId: player.pid,
        wallet: wallet.toString(),
        amount,
        newBalance
      });
    }
  });

  app.on("client:withdraw", async ([amount, clientWallet], nid) => {
    log('Withdraw request received:', { amount, clientWallet, nid });
    const player = players.get(nid);
    log('Player data:', player);

    if (!player || player.balance < player.balance) {
      log('Withdrawal rejected - insufficient balance:', {
        playerBalance: player?.balance,
        requestedAmount: player.balance
      });
      app.sendTo(nid, "server:withdraw:error", "Insufficient balance");
      return;
    }

    try {
      const token = await app.solana.programs.token(TOKEN)
      log('Initiating token transfer to client');
      const res = await token.transfer(clientWallet, player.balance);

      if (res.success) {
        log('Withdrawal successful');
        updatePlayerBalance(nid, player.balance - player.balance);
        app.sendTo(nid, "server:withdraw:success");
        // Broadcast withdrawal event to other server scripts
        app.emit("token:player_withdraw", {
          playerId: player.pid,
          wallet: clientWallet.toString(),
          amount,
          newBalance: player.balance - player.balance
        });
      } else {
        log('Withdrawal failed:', error);
        app.sendTo(nid, "server:withdraw:error", error.message);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      app.sendTo(nid, "server:withdraw:error", error.message);
    }
  });

  world.on('solana', ({ player }) => {
    const hasPlayer = players.get(player.networkId)
    if (!hasPlayer) players.set(player.networkId, { wallet: player.solana, pid: player.playerId, nid: player.networkId })
    else players.set(player.networkId, { ...hasPlayer, wallet: player.solana })
    console.log([...players.entries()])
  })

  app.on("client:connect", async ([wallet, pid], nid) => {
    log('Client connected:', { wallet, pid, nid });
    players.set(nid, { wallet, pid, balance: 0 });
    const serverBalance = await getServerBalance();
    log('Sending server wallet to client:', {
      serverWallet: app.solana.wallet.publicKey.toString(),
      serverBalance: serverBalance?.balance
    });
  });

  world.on("leave", ({ player }) => {
    const { networkId, id } = player
    log('Player left:', { networkId, id });
    players.delete(networkId);
    log('Updated players map:', players);
  });

  app.registerCommand("dtb", () => {
    const balances = Array.from(players.entries()).map(([nid, player]) => ({
      nid,
      pid: player.pid,
      wallet: player.wallet.toString(),
      balance: player.balance
    }));
    log('Current player balances:', balances);
  }, false)


}

if (world.isClient) {
  log('Client initialized');

  // UI Setup
  const ui = app.create("ui");
  ui.width = 400;
  ui.height = 400;
  ui.backgroundColor = "rgba(0, 0, 0, 0.7)";
  ui.position.set(-3, 0, 0);
  ui.billboard = "full";
  ui.justifyContent = "center";
  ui.alignItems = "center";
  ui.padding = 10;
  ui.gap = 5;

  const label = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Fun with SPL tokens!",
    color: "white",
    fontSize: 24,
  });
  ui.add(label);

  // Balance information sections
  const serverBalanceText = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Server Balance: Loading...",
    color: "white",
    fontSize: 16,
  });
  

  const clientBalanceText = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Your Balance: Loading...",
    color: "white",
    fontSize: 16,
  });

  const serverStoredBalanceText = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Your Server Balance: 0",
    color: "white",
    fontSize: 16,
  });
  

  // Buttons
  const depositButton = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Deposit HYPER",
    color: "white",
    onPointerDown: () => {
      log('Deposit button clicked');
      setMode(loadingMode);
      startDepositOperation()
        .then(() => {
          log('Deposit operation completed successfully');
          setMode(successMode);
        })
        .catch((error) => {
          console.error("Deposit failed:", error);
          setMode(errorMode);
        });
    },
    onPointerEnter: () => (depositButton.color = "purple"),
    onPointerLeave: () => (depositButton.color = "white"),
    cursor: "pointer",
  });
  

  const withdrawButton = app.create("uitext", {
    padding: 4,
    textAlign: "center",
    value: "Withdraw HYPER",
    color: "white",
    onPointerDown: () => {
      log('Withdraw button clicked');
      setMode(loadingMode);
      startWithdrawOperation()
        .then(() => {
          log('Withdraw operation completed successfully');
          setMode(successMode);
        })
        .catch((error) => {
          console.error("Withdraw failed:", error);
          setMode(errorMode);
        });
    },
    onPointerEnter: () => (withdrawButton.color = "purple"),
    onPointerLeave: () => (withdrawButton.color = "white"),
    cursor: "pointer",
  });
  
  ui.add(serverBalanceText);
  ui.add(clientBalanceText);
  ui.add(serverStoredBalanceText);
  ui.add(depositButton);
  ui.add(withdrawButton);

  // Event handlers
  const player = world.getPlayer();

  let tokenData

  // Balance update function
  async function updateClientBalance() {
    log('Updating client balance');
    if (!app.solana?.connection || !app.solana?.wallet?.publicKey) {
      log('No Solana connection for client balance');
      return;
    }
    const { token } = app.solana.programs;
    try {
      const balance = await token.balance({
        tokenMint: TOKEN,
        walletAddress: app.solana.wallet.publicKey,
        decimals: tokenData?.decimals
      });
      log('Client balance fetched:', balance);
      clientBalanceText.value = `Your Balance: ${balance.balance} ${tokenData?.symbol}`;
    } catch (error) {
      console.error("Failed to fetch client balance:", error);
      clientBalanceText.value = "Your Balance: Error";
    }
  }

  // Mode functions
  function defaultMode() {
    log('Entering default mode');
    depositButton.value = "Deposit HYPER";
    withdrawButton.value = "Withdraw HYPER";
    depositButton.color = "white";
    withdrawButton.color = "white";
    return () => {
      log('Cleaning up default mode');
      // Cleanup
    };
  }

  function loadingMode() {
    log('Entering loading mode');
    const activeButton = mode === startDepositOperation ? depositButton : withdrawButton;
    const action = mode === startDepositOperation ? "Depositing" : "Withdrawing";
    activeButton.value = action + "...";
    activeButton.color = "yellow";

    let dots = "";
    const updateHandler = (delta) => {
      const time = world.getTime();
      if (time % 0.5 < 0.1) {
        dots = dots.length >= 3 ? "" : dots + ".";
        activeButton.value = action + dots;
      }
    };

    app.on("update", updateHandler);

    return () => {
      log('Cleaning up loading mode');
      app.off("update", updateHandler);
    };
  }

  function successMode() {
    log('Entering success mode');
    const activeButton = mode === startDepositOperation ? depositButton : withdrawButton;
    const action = mode === startDepositOperation ? "Deposit" : "Withdraw";
    activeButton.value = `${action} Success!`;
    activeButton.color = "green";

    const startTime = world.getTime();
    const duration = 2;

    const updateHandler = (delta) => {
      const elapsedTime = world.getTime() - startTime;
      if (elapsedTime >= duration) {
        app.off("update", updateHandler);
        setMode(defaultMode);
      }
    };

    app.on("update", updateHandler);
    updateClientBalance();

    return () => {
      log('Cleaning up success mode');
      app.off("update", updateHandler);
    };
  }

  function errorMode() {
    log('Entering error mode');
    const activeButton = mode === startDepositOperation ? depositButton : withdrawButton;
    const action = mode === startDepositOperation ? "Deposit" : "Withdraw";
    activeButton.value = `${action} Failed`;
    activeButton.color = "red";

    const startTime = world.getTime();
    const duration = 2;

    const updateHandler = (delta) => {
      const elapsedTime = world.getTime() - startTime;
      if (elapsedTime >= duration) {
        app.off("update", updateHandler);
        setMode(defaultMode);
      }
    };

    app.on("update", updateHandler);

    return () => {
      log('Cleaning up error mode');
      app.off("update", updateHandler);
    };
  }

  function startDepositOperation() {
    log('Starting deposit operation');
    return new Promise((resolve, reject) => {
      if (!app.solana?.connection) {
        log('No Solana connection for deposit');
        reject(new Error("No Solana connection"));
        return;
      }

      // Emit event to trigger game loading mode
      app.emit("token:deposit:start");

      const { token } = app.solana.programs;
      log('Initiating token transfer to server:', {
        tokenMint: TOKEN,
        recipientAddress: SERVER_WALLET,
        amount: DEFAULT_AMOUNT * 10 ** tokenData?.decimals ?? 9,
        decimals: tokenData?.decimals ?? 9
      });

      token.transfer({
        tokenMint: TOKEN,
        recipientAddress: SERVER_WALLET,
        amount: DEFAULT_AMOUNT * 10 ** tokenData?.decimals ?? 9,
        decimals: tokenData?.decimals ?? 9,
        onSuccess: () => {
          log('Deposit successful');
          app.send("client:deposit", [DEFAULT_AMOUNT, app.solana.wallet.publicKey.toString()])
          app.emit("token:deposit:success");
          resolve();
        },
        onError: (error) => {
          log('Deposit failed:', error);
          app.emit("token:deposit:error", error);
          reject(error);
        },
      });
    });
  }

  function startWithdrawOperation() {
    log('Starting withdraw operation');
    return new Promise((resolve, reject) => {
      app.emit("token:withdraw:start");

      log('Sending withdraw request to server:', {
        amount: DEFAULT_AMOUNT,
        wallet: app.solana.wallet.publicKey
      });
      app.send("client:withdraw", [DEFAULT_AMOUNT, app.solana.wallet.publicKey]);

      const successHandler = () => {
        log('Withdraw request successful');
        app.off("server:withdraw:success", successHandler);
        app.off("server:withdraw:error", errorHandler);
        app.emit("token:withdraw:success");
        resolve();
      };

      const errorHandler = (error) => {
        log('Withdraw request failed:', error);
        app.off("server:withdraw:success", successHandler);
        app.off("server:withdraw:error", errorHandler);
        app.emit("token:withdraw:error", error);
        reject(new Error(error));
      };

      app.on("server:withdraw:success", successHandler);
      app.on("server:withdraw:error", errorHandler);
    });
  }


  app.on("server:wallet", (serverTokenData) => {
    log('Received server wallet info:', { wallet: serverTokenData.serverWallet, balance: serverTokenData.serverBalance });
    SERVER_WALLET = serverTokenData.serverWallet;
    tokenData = serverTokenData
    serverBalanceText.value = `Server Balance: ${serverTokenData.serverBalance} ${tokenData?.symbol}`;
    updateClientBalance();
  });

  app.on("server:balance:update", (balance) => {
    log('Received server balance update:', balance);
    serverStoredBalanceText.value = `Your Server Balance: ${balance} ${tokenData.symbol}`;
    app.emit("client:balance:update", balance)
  });

  // Initial setup
  log('Sending client connect:', {
    wallet: app.solana.wallet.publicKey,
    playerId: player.id
  });
  app.send("client:connect", [app.solana.wallet.publicKey, player.id]);

  world.on('solana', ({ player: solPlayer }) => {
    console.log({ player, solPlayer })
    if (player.id === solPlayer.id) {
      console.log('new wallet, fetching balance')
      updateClientBalance();
    }
  })
  app.add(ui);
  setMode(defaultMode);
}