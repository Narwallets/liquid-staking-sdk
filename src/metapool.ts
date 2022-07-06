/// Implements a proxy class to call Meta Pool contract https://github.com/Narwallets/meta-pool/blob/master/metapool/src/lib.rs

import BN from "bn.js"
import * as nearAPI from "near-api-js"

export class Metapool {

  constructor(
    public readonly account: nearAPI.Account, 
    public readonly contractId: string = "meta-pool.near") {
  }

  /**
   * perform a function call (update state) on metapool contract
   *
   * @param {string} methodName - contract method to invoke
   * @param {Object} args - JSON args for the function call
   * @param {number} tgas - The amount of Tera-gas for the call 5-300
   * @param {BN} attachedYoctos - The amount of yoctonear to attach to the call
  */
  async call(methodName:string, args:Record<string,any>, tgas?:number, attachedYoctos?:BN): Promise<any> {
    return this.account.functionCall ({
      contractId: this.contractId,
      methodName,
      args,
      gas: new BN((tgas||200).toFixed()+"0".repeat(12)),
      attachedDeposit: attachedYoctos||new BN(0),
    })
  }

  /**
   * perform a view call (read-only) on metapool contract
   *
   * @param {Object} args - JSON args for the function call
   * @param {number} tgas - The amount of Tera-gas for the call 5-300
   * @param {BN} attachedYoctos - The amount of yoctonear to attach to the call
  */
  async view(methodName:string, args?:Record<string,any>): Promise<any>{
    return this.account.viewFunction(
      this.contractId,
      methodName,
      args,
    )
  }

  /**
   * get stNEAR balance for the account
   * @param account_id user acount
   * @returns U128String stNEAR balance for the account
   */
  ft_balance_of(account_id: string): Promise<string> {
    return this.view("ft_balance_of", { account_id: account_id })
  }


  /**
   * calls deposit and stake in the Meta Pool contract
   * Stake NEAR in Meta Pool, you get stNEAR in your wallet
   *
   * @param {BN} attachedYoctos - The amount of yoctonear to stake
   * @result - stNEAR in the user wallet
  */
  async stake(attachedYoctos: BN): Promise<any> { 
    return this.call("deposit_and_stake", {}, 50, attachedYoctos)
  }

  /**
   * calls liquid stake in the Meta Pool contract
   * Liquid unstake stNEAR from Meta Pool, you get NEAR in your wallet immediately
   *
   * @param {BN} yoctoStNEAR - The amount of yoctstNEAR to stake
   * @param {BN} minExpectedYoctos - The minimun amount of yoctos expected (allows the user to put a limit on fees paid)
  */
  async liquidUnstake(yoctoStNEAR: BN, minExpectedYoctos:BN): Promise<any> {
    return this.call(
      "liquid_unstake",
      { st_near_to_burn: yoctoStNEAR.toString(), 
        min_expected_near: minExpectedYoctos.toString(),
      }
    )
  }

  /// simulates a liquid unstake and return potential NEARs to receive
  get_near_amount_sell_stnear(yoctoStNEARToSell: BN): Promise<U128String> {
    return this.view("get_near_amount_sell_stnear", { "stnear_to_sell": yoctoStNEARToSell.toString() })
  }

  /// returns JSON string according to [NEP-129](https://github.com/nearprotocol/NEPs/pull/129)
  get_contract_info(): Promise<ContractInfo> {
    return this.view("get_contract_info")
  }

  get_contract_state(): Promise<ContractState> {
    return this.view("get_contract_state")
  }

  get_contract_params(): Promise<ContractParams> {
    return this.view("get_contract_params")
  }

  async get_number_of_accounts(): Promise<bigint> {
    return BigInt(await this.view("get_number_of_accounts", {}))
  }

  get_accounts_info(from_index: number, limit: number): Promise<GetAccountInfoResult[]> {
    return this.view("get_accounts_info", { from_index: from_index, limit: limit })  //params are U64String
  }

  /// get account info from current connected user account
  get_account_info(accountId: string): Promise<GetAccountInfoResult> {
    return this.view("get_account_info", { account_id: accountId })
  }

  withdraw(nearsToWithdraw: BN): Promise<void> {
    return this.call("withdraw", { amount: nearsToWithdraw.toString()})
  }

  unstake(yoctoStNEAR: BN): Promise<void> {
    return this.call("unstake", { "amount": yoctoStNEAR.toString() })
  }

  unstake_all(): Promise<void> {
    return this.call("unstake_all", {})
  }

  /// current fee for liquidity providers
  nslp_get_discount_basis_points(yoctoStNEARToSell: BN): Promise<number> {
    return this.view("nslp_get_discount_basis_points", { "stnear_to_sell": yoctoStNEARToSell.toString() })
  }

  /// add liquidity
  nslp_add_liquidity(yoctos: BN): Promise<number> {
    return this.call("nslp_add_liquidity", {}, 75, yoctos)
  }

  /// remove liquidity
  nslp_remove_liquidity(lpYoctoShares: number): Promise<RemoveLiquidityResult> {
    return this.call("nslp_remove_liquidity", { "amount": lpYoctoShares.toString()})
  }

}

// STRUCTS

type U64String = string;
type U128String = string;

//struct returned from get_account_info
export type GetAccountInfoResult = {
  account_id: string;
  /// The available balance that can be withdrawn
  available: U128String,
  /// The amount of stNEAR owned (computed from the shares owned)
  stnear: U128String,
    
  /// The amount of $META owned (including pending rewards)
  meta: U128String,
  /// The amount of $META realized & secured
  realized_meta: U128String,

  /// The amount of rewards (rewards = total_staked - stnear_amount) and (total_owned = stnear + rewards)
  unstaked: U128String,
  /// The epoch height when the unstaked was requested
  /// The fund will be locked for NUM_EPOCHS_TO_UNLOCK epochs
  /// unlock epoch = unstaked_requested_epoch_height + NUM_EPOCHS_TO_UNLOCK 
  unstaked_requested_epoch_height: string; //U64,
  ///if env::epoch_height()>=account.unstaked_requested_epoch_height+NUM_EPOCHS_TO_UNLOCK
  can_withdraw: boolean,
  /// total amount the user holds in this contract: account.available + account.staked + current_rewards + account.unstaked
  total: U128String,

  //-- STATISTICAL DATA --
  // User's statistical data
  // These fields works as a car's "trip meter". The user can reset them to zero.
  /// trip_start: (timestamp in nanoseconds) this field is set at account creation, so it will start metering rewards
  trip_start: string, //U64,
  /// How much stnear the user had at "trip_start". 
  trip_start_stnear: U128String,
  /// how much the user staked since trip start. always incremented
  trip_accum_stakes: U128String,
  /// how much the user unstaked since trip start. always incremented
  trip_accum_unstakes: U128String,
  /// to compute trip_rewards we start from current_stnear, undo unstakes, undo stakes and finally subtract trip_start_stnear
  /// trip_rewards = current_stnear + trip_accum_unstakes - trip_accum_stakes - trip_start_stnear;
  /// trip_rewards = current_stnear + trip_accum_unstakes - trip_accum_stakes - trip_start_stnear;
  trip_rewards: U128String,

  ///NS liquidity pool shares, if the user is a liquidity provider
  nslp_shares: U128String,
  nslp_share_value: U128String,
  nslp_share_bp: number, //basis points u16,

  stake_shares: U128String,
}

// JSON compatible struct returned from get_contract_state
export type ContractState = {

  env_epoch_height: U64String,
  contract_account_balance: U128String,
    
  /// This amount increments with deposits and decrements with for_staking
  /// increments with complete_unstake and decrements with user withdrawals from the contract
  /// withdrawals from the pools can include rewards
  /// since staking is delayed and in batches it only eventually matches env::balance()
  total_available: U128String,

  /// The total amount of tokens selected for staking by the users 
  /// not necessarily what's actually staked since staking can be done in batches
  total_for_staking: U128String,

  /// we remember how much we sent to the pools, so it's easy to compute staking rewards
  /// total_actually_staked: Amount actually sent to the staking pools and staked - NOT including rewards
  /// During distribute(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in 100kN batches
  total_actually_staked: U128String, 

  epoch_stake_orders: U128String, 
  epoch_unstake_orders: U128String, 
    
  /// sum(accounts.unstake). Every time a user delayed-unstakes, this amount is incremented
  /// when the funds are withdrawn the amount is decremented.
  /// Control: total_unstaked_claims == reserve_for_unstaked_claims + total_unstaked_and_waiting
  total_unstake_claims: U128String, 

  // how many "shares" were minted. Every time someone "stakes" he "buys pool shares" with the staked amount
  // the share price is computed so if he "sells" the shares on that moment he recovers the same near amount
  // staking produces rewards, so share_price = total_for_staking/total_shares
  // when someone "unstakes" she "burns" X shares at current price to recoup Y near
  total_stake_shares: U128String, 

  /// The total amount of tokens actually unstaked (the tokens are in the staking pools)
  /// During distribute(), If !staking_paused && total_for_unstaking<total_actually_unstaked, then the difference gets unstaked in 100kN batches
  total_unstaked_and_waiting: U128String, 

  /// Every time a user performs a delayed-unstake, stNEAR tokens are burned and the user gets a unstaked_claim that will
  /// be fulfilled 4 epochs from now. If there are someone else staking in the same epoch, both orders (stake & d-unstake) cancel each other
  /// (no need to go to the staking-pools) but the NEAR received for staking must be now reserved for the unstake-withdraw 4 epochs form now. 
  /// This amount increments *after* end_of_epoch_clearing, *if* there are staking & unstaking orders that cancel each-other.
  /// This amount also increments at retrieve_from_staking_pool
  /// The funds here are *reserved* fro the unstake-claims and can only be user to fulfill those claims
  /// This amount decrements at unstake-withdraw, sending the NEAR to the user
  /// Note: There's a extra functionality (quick-exit) that can speed-up unstaking claims if there's funds in this amount.
  reserve_for_unstake_claims: U128String, 

  /// total meta minted
  total_meta : U128String,
  st_near_price: U128String,

  /// the staking pools will add rewards to the staked amount on each epoch
  /// here we store the accumulated amount only for stats purposes. This amount can only grow
  accumulated_staked_rewards: U128String, 

  nslp_liquidity : U128String,
  nslp_stnear_balance : U128String,
  nslp_target : U128String,
  nslp_share_price : U128String,
  nslp_total_shares : U128String,
  /// Current discount for immediate unstake (sell stNEAR)
  nslp_current_discount_basis_points: number,
  nslp_min_discount_basis_points: number,
  nslp_max_discount_basis_points: number,

  accounts_count: string,//U64,

  //count of pools to diversify in
  staking_pools_count: number, //u16, 

  min_deposit_amount: U128String,

  est_meta_rewards_stakers: U128String,
  est_meta_rewards_lu: U128String,
  est_meta_rewards_lp: U128String,

  max_meta_rewards_stakers: U128String,
  max_meta_rewards_lu: U128String,
  max_meta_rewards_lp: U128String,
}


export type StakingPoolJSONInfo = {
  inx: number,
  account_id: string,
  weight_basis_points: number,
  staked: string,//u128
  unstaked: string,//u128
  unstaked_requested_epoch_height: string, //U64String, 
  //EpochHeight where we asked the sp what were our staking rewards
  last_asked_rewards_epoch_height: string, //U64String,
}

export type RemoveLiquidityResult = {
  near: U128String,
  st_near: U128String
}

export type LiquidUnstakeResult = {
  near: U128String,
  fee: U128String,
  meta: U128String,
}

// JSON compatible struct returned from get_contract_params
export type ContractParams = {
  nslp_liquidity_target: U128String,
  nslp_max_discount_basis_points: number,
  nslp_min_discount_basis_points: number,
  staker_meta_mult_pct: number,
  stnear_sell_meta_mult_pct: number,
  lp_provider_meta_mult_pct: number,
  operator_rewards_fee_basis_points: number,
  operator_swap_cut_basis_points: number,
  treasury_swap_cut_basis_points: number,
  min_deposit_amount: U128String
}

// JSON compatible struct returned from get_contract_info
export type ContractInfo = {
  dataVersion:number;
  name:string;
  version:string;
  developersAccountId:string;
  source:string;
  standards:string[],
  webAppUrl:string,
  auditorAccountId:string,
}
