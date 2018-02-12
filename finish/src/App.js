import React, { Component } from "react";

// UI
import { Tabs, Icon, notification } from "antd";
const TabPane = Tabs.TabPane;
import "antd/dist/antd.css";

// Web3
import getWeb3 from "./utils/getWeb3";

// Componenets
import Vote from "./Vote";
import Add from "./Add";
import Result from "./Result";

// Contract
const contract = require("truffle-contract");
import VoteDappContract from "../build/contracts/VoteDapp.json";
const voteDapp = contract(VoteDappContract);


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedTab: "vote",
      candidates: [],
      accounts: []
    };

    // Contract
    this.voteDapp = contract(VoteDappContract);
  }

  componentWillMount() {
    getWeb3
      .then(results => {
        if(results !== null){
          console.log(results.web3);
          this.setState({
            web3: results.web3
          });
          // Call contract once web3 provided.
          this.getCandidatesList(this.state.web3);
        } else {
          throw Error("web3 error");
        }
      })
      .catch(e => {
        notification.error({
          message: "ERROR",
          duration: 0,
          description: `${e}`
        });
      });
  }

  getCandidatesList = (web3) => {
    voteDapp.setProvider(web3.currentProvider);

    let voteDappInstance; // contract instance

    // Get accounts.
    web3.eth.getAccounts((error, accounts) => {
      voteDapp
        .deployed()
        .then(instance => {
          this.setState({
            accounts: accounts
          });
          voteDappInstance = instance;
          return voteDappInstance.getCandidatesCount.call();
        })
        .then(result => {
          const candidateCount = result.toNumber(); // Bignumber js
          console.log(`There are ${candidateCount} candidates`);

          for (let index = 0; index < candidateCount; index++) {
            // Get every candidate
            console.log(`Candidate :${index}`);
            voteDappInstance.getCandidate.call(index).then(candidate => {
              const candidates = this.state.candidates;

              candidates.push({
                index,
                voteCount: candidate[0].toNumber(),
                name: web3.toUtf8(candidate[1])
              });

              this.setState({
                candidates
              });
            });
          }
        })
        .catch(err => {
          console.warn(err);
        });
    });
  };

  onAddCandidate = name => {
    let voteDappInstance; // contract instance

    const nameHex = this.state.web3.fromAscii(name);
    console.log("Name", nameHex, this.state.web3.toUtf8(nameHex));

    voteDapp
      .deployed()
      .then(instance => {
        voteDappInstance = instance;
        return voteDappInstance
          .addCandidate(nameHex, {
            from: this.state.accounts[0]
          })
          .then(result => {
            console.log("Added success", result);

            // Events
            for (var i = 0; i < result.logs.length; i++) {
              var log = result.logs[i];

              if (log.event === "CandidateAdded") {
                // We found the event!
                console.log(this.state.web3.toUtf8(log.args.name));
                this.onAddEventSuccess(this.state.web3.toUtf8(log.args.name));
                break;
              }
            }
          });
      })
      .then(result => {
        console.log(result);
      })
      .catch(err => {
        console.warn(err);
      });
  };

  onAddEventSuccess(index) {
    notification.success({
      message: "Added: " + index,
      description: `${index}`
    });
  }

  onVoteSuccess = () => {
    notification.success({
      message: "Voted"
    });
  };

  onVote = candidate => {
    console.log(candidate);

    //////////
    let voteDappInstance; // contract instance
    voteDapp
      .deployed()
      .then(instance => {
        voteDappInstance = instance;
        return voteDappInstance
          .submitVote(candidate.index, {
            from: this.state.accounts[0]
          })
          .then(result => {
            console.log("Vote success", result);
            this.onVoteSuccess();
          });
      })
      .then(result => {
        console.log(result);
      })
      .catch(err => {
        console.warn(err);
      });
    //////////
  };

  onCheckResultSuccess = result => {
    const winnerVote = result[0];
    const winnerName = result[1];
    this.setState({
      winner: {
        vote: winnerVote.toNumber(),
        name: this.state.web3.toUtf8(winnerName)
      }
    });
  };

  onCheckResult = () => {
    let voteDappInstance; // contract instance
    voteDapp
      .deployed()
      .then(instance => {
        voteDappInstance = instance;
        return voteDappInstance.getWinner
          .call()
          .then(result => {
            // console.log(result);
            this.onCheckResultSuccess(result);
          })
          .catch(err => {
            console.warn(err);
          });
      })
      .catch(e => {
        console.warn(e);
        notification.error({
          message: "ERROR",
          duration: 0,
          description: `${e}`
        });
      });
  };

  onTabChange = key => {
    this.setState({
      selectedTab: key
    });
    if (key === "vote") {
      // empty list
      this.setState({
        candidates: []
      });

      this.getCandidatesList(this.state.web3);
    }
  };

  render() {
    return (
      <Tabs defaultActiveKey="1" onChange={this.onTabChange}>
        <TabPane
          tab={
            <span>
              <Icon type="home" /> Vote
            </span>
          }
          key="vote"
        >
          <Vote
            candidates={this.state.candidates}
            currentTab={this.state.selectedTab}
            submitVote={this.onVote}
          />
        </TabPane>
        <TabPane
          tab={
            <span>
              <Icon type="rocket" /> Add
            </span>
          }
          key="add"
        >
          <Add
            onAdd={this.onAddCandidate}
            currentTab={this.state.selectedTab}
          />
        </TabPane>
        <TabPane
          tab={
            <span>
              <Icon type="hourglass" /> Results
            </span>
          }
          key="results"
        >
          <Result winner={this.state.winner} onCheckResult={this.onCheckResult} />
        </TabPane>
      </Tabs>
    );
  }
}

export default App;