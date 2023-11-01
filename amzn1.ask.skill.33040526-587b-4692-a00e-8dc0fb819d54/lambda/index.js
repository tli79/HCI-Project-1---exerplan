/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2) and connecting it to the openAI LLM GPT3.5-turbo
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * Please visit https://platform.openai.com/docs/guides/gpt for understanding how to use GPT
 * */
const Alexa = require('ask-sdk-core');
const {Configuration, OpenAIApi} = require('openai');
var gptTurboMessage =  [{role:"system", content: "As an AI voice assistant based on ChatGPT, your primary purpose is to engage in conversations with users about travel plans. You should keep your response under 25 words."}]; //Try to be brief when possible.
const axios = require('axios');
const fs = require("fs");

const intro_hi = ["Hello! ", "Hi! ", "Hey! ", "Welcome! "]

const intro = ['How can I assist you today?', 'What do you wanna know?', 'What questions do you have?', 'What would you like to know?'  ];

const other = ['Any other questions for me?', 'What else can I help you with?', 'Anything else you\'d like to know?', 'Anything else?'];

const bye = ["Goodbye!", "Untill next time!", "Take care!", "Stay safe!", "Bye!", "Have a good one!"];

const fillers = ["checking that for you!", "searching!", "looking up!", "still fetching!", "Almost there!", "let me check!", "I'm on it!", "Hold on!", "still looking!"];

var location;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const fs = require("fs");
        const index = Math.floor(Math.random() * 3);
        const index_hi = Math.floor(Math.random() * 3);
        const index2 = Math.floor(Math.random() * 3);
        const speakOutput = intro_hi[index_hi] + "Welcome to exerplan, an Alexa-powered fitness planning assistant"
        const reprompting = intro[index2];
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompting)
            .getResponse();
    }
};




function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const index_bye = Math.floor(Math.random() * 5);
        const speakOutput = bye[index_bye];

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .repromt(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Is there something else you would like to know?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.speak("An error has occured. I cannot reach the model. Please try again!").getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ExerciseRecommendationIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ExerciseRecommendationIntent';
  },
  
  async handle(handlerInput) {
    const exerciseType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'exerciseType') || '';
    const question = `What's a good ${exerciseType} workout? Please give me a concrete routine.`;
    gptTurboMessage.push({ role: "user", content: question });

    const timeoutId = setTimeout(() => {
    console.log('API call not completed within 4 seconds. so sending a progressive call ');

      let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('Directive sent successfully!');
      })
      .catch(error => {
        console.error('Error sending directive:', error);
      });
      
}, 10000);

    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const authToken = 'Bearer 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';
    const requestData = {
      model : 'gpt-3.5-turbo',
      messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

    const index_filler = Math.floor(Math.random() * 8);
    const repromptText = fillers[index_filler];
    
    const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText,
    };
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

    try {
      const apiResponse = await apiResponsePromise;
      clearTimeout(timeoutId);
      
      const finalSpeech = `${apiResponse.data.choices[0].message.content}.`;
      const index2 = Math.floor(Math.random() * 3);
      gptTurboMessage.push({role:apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
      
      return handlerInput.responseBuilder
        .speak(finalSpeech)
        .reprompt(other[index2])
        .getResponse();
    } 
    catch (error) {
      console.error(error);
      handlerInput.responseBuilder
        .speak('Something went wrong. I cannot connect to my base.');
    }
  }
};

const CreateWorkoutPlanIntentHandler = {
  canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateWorkoutPlanIntent';
    },
   async handle(handlerInput) {
        const duration = Alexa.getSlotValue(handlerInput.requestEnvelope, 'duration');
        const workoutType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'workoutType');
        const frequency = Alexa.getSlotValue(handlerInput.requestEnvelope, 'frequency');

        const question = `Creating a ${workoutType} workout plan for ${duration} minutes, ${frequency} days a week. Stay fit and have fun!`;
    gptTurboMessage.push({ role: "user", content: question });

    const timeoutId = setTimeout(() => {
    console.log('API call not completed within 4 seconds. so sending a progressive call ');

      let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('Directive sent successfully!');
      })
      .catch(error => {
        console.error('Error sending directive:', error);
      });
      
}, 10000);

    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const authToken = 'Bearer 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';
    const requestData = {
      model : 'gpt-3.5-turbo',
      messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

    const index_filler = Math.floor(Math.random() * 8);
    const repromptText = fillers[index_filler];
    
    const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText,
    };
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

    try {
      const apiResponse = await apiResponsePromise;
      clearTimeout(timeoutId);
      
      const finalSpeech = `${apiResponse.data.choices[0].message.content}.`;
      const index2 = Math.floor(Math.random() * 3);
      gptTurboMessage.push({role:apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
      
      return handlerInput.responseBuilder
        .speak(finalSpeech)
        .reprompt(other[index2])
        .getResponse();
    } 
    catch (error) {
      console.error(error);
      handlerInput.responseBuilder
        .speak('Something went wrong. I cannot connect to my base.');
    }
  }
};

const WorkoutDurationIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WorkoutDurationIntent';
  },
  
  async handle(handlerInput) {
    const userInput = Alexa.getInputText(handlerInput.requestEnvelope) || 'How long should I workout?';
    let gptTurboMessage = [{role:"user", content: userInput}];

    const timeoutId = setTimeout(() => {
      console.log('API call not completed within 4 seconds. Sending a progressive response...');

      let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('Directive sent successfully!');
      })
      .catch(error => {
        console.error('Error sending directive:', error);
      });
      
    }, 10000);

    // Making a POST API call to the OpenAI GPT-3.5 turbo endpoint
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const authToken = 'Bearer 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';
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    // Get the API access token and request ID
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

    const fillers = [
      'Let me think...', 
      'One moment...',
      'Checking the best duration...', 
      //... add more fillers as needed
    ];
    
    const index_filler = Math.floor(Math.random() * fillers.length);
    const repromptText = fillers[index_filler];
    
    const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText,
    };
    
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

    try {
      const apiResponse = await apiResponsePromise;
      clearTimeout(timeoutId);

      const finalSpeech = apiResponse.data.choices[0].message.content;
      gptTurboMessage.push({role: apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
      
      return handlerInput.responseBuilder
        .speak(finalSpeech)
        .reprompt(finalSpeech)
        .getResponse();
    } catch (error) {
      console.error(error);
      return handlerInput.responseBuilder
        .speak('Sorry, I had an issue providing a workout duration recommendation. Please try again later.')
        .getResponse();
    }
  }
};

const WorkoutTipIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WorkoutTipIntent';
  },
  
  async handle(handlerInput) {
    const bodyPart = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bodyPart') || '';
    const question = bodyPart ? `Give me a workout tip for ${bodyPart}` : 'Give me a workout tip';
    let gptTurboMessage = [{role:"user", content: question}];

    const timeoutId = setTimeout(() => {
      console.log('API call not completed within 4 seconds. Sending a progressive response...');

      let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('Directive sent successfully!');
      })
      .catch(error => {
        console.error('Error sending directive:', error);
      });
      
    }, 10000);

    // Making a POST API call to the OpenAI GPT-3.5 turbo endpoint
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const authToken = 'Bearer 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';
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    // Get the API access token and request ID
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

    const fillers = [
      'Let me think...', 
      'One moment...',
      'Checking for some tips...', 
      //... add more fillers as needed
    ];
    
    const index_filler = Math.floor(Math.random() * fillers.length);
    const repromptText = fillers[index_filler];
    
    const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText,
    };
    
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

    try {
      const apiResponse = await apiResponsePromise;
      clearTimeout(timeoutId);

      const finalSpeech = apiResponse.data.choices[0].message.content;
      gptTurboMessage.push({role: apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
      
      return handlerInput.responseBuilder
        .speak(finalSpeech)
        .reprompt(finalSpeech)
        .getResponse();
    } catch (error) {
      console.error(error);
      return handlerInput.responseBuilder
        .speak('Sorry, I had an issue getting a workout tip for you. Please try again later.')
        .getResponse();
    }
  }
};



const ExerciseDetailIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ExerciseDetailIntent';
    },
  
  
  async handle(handlerInput) {
      const exercise = Alexa.getSlotValue(handlerInput.requestEnvelope, 'exercise');
        /*if (!exercise) {
            return handlerInput.responseBuilder
                .speak('Sorry, I didn\'t catch the exercise name. Can you please specify the exercise you want to know about?')
                .reprompt('Which exercise do you want to learn about?')
                .getResponse();
        }*/

    const question = `Tell me about how to properly do ${exercise} with correct form.`;
    let gptTurboMessage = [{role:"user", content: question}];

    const timeoutId = setTimeout(() => {
      console.log('API call not completed within 4 seconds. Sending a progressive response...');

      let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('Directive sent successfully!');
      })
      .catch(error => {
        console.error('Error sending directive:', error);
      });
      
    }, 20000);

    // Making a POST API call to the OpenAI GPT-3.5 turbo endpoint
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const authToken = 'Bearer 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';
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    // Get the API access token and request ID
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

    const fillers = [
      'Let me think...', 
      'One moment...',
      'Checking for some tips...', 
      //... add more fillers as needed
    ];
    
    const index_filler = Math.floor(Math.random() * fillers.length);
    const repromptText = fillers[index_filler];
    
    const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText,
    };
    
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

    try {
      const apiResponse = await apiResponsePromise;
      clearTimeout(timeoutId);

      const finalSpeech = apiResponse.data.choices[0].message.content;
      gptTurboMessage.push({role: apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
      
      return handlerInput.responseBuilder
        .speak(finalSpeech)
        .reprompt(finalSpeech)
        .getResponse();
    } catch (error) {
      console.error(error);
      return handlerInput.responseBuilder
        .speak('Sorry, I had an issue getting a workout tip for you. Please try again later.')
        .getResponse();
    }
  }
};


const TrackProgressIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TrackProgressIntent';
    },
    handle(handlerInput) {
        const exerciseDone = Alexa.getSlotValue(handlerInput.requestEnvelope, 'exerciseDone');
        const duration = Alexa.getSlotValue(handlerInput.requestEnvelope, 'duration');

        const speechText = `Great! I've logged that you did ${exerciseDone} for ${duration}. Keep up the good work!`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const AskChatGPTIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskChatGPTIntent';
  },
  
  
  async handle(handlerInput) {
    const question = 
            Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
    gptTurboMessage.push({role:"user", content:  question});

  
  const timeoutId = setTimeout(() => {
  console.log('API call not completed within 4 seconds. so sending a progressive call ');

    let progressiveApiResponsePromise = axios.post('https://api.amazonalexa.com/v1/directives', request, {
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('Directive sent successfully!');
    })
    .catch(error => {
      console.error('Error sending directive:', error);
    });
    
},20000);


   // make a POST API call to the OpenAI GPT-3.5 turbo endpoint
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const authToken = 'Bearer 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';
  const requestData = {
        model : 'gpt-4',
        messages: gptTurboMessage
    };
    
    let apiResponsePromise = axios.post(apiUrl, requestData, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });
    
    //progressive call 
   
    // Get the API access token and request ID
    const apiAccessToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
    const requestId = handlerInput.requestEnvelope.request.requestId;

   
    const index_filler = Math.floor(Math.random() * 8);
    const repromptText = fillers[index_filler];
    
   
   const directive = {
      type: 'VoicePlayer.Speak',
      speech: repromptText, //+ '<break time="5s"/>' + 'still looking',
    };
    const request = {
      header: {
        requestId: requestId
      },
      directive: directive
    };

  try{
    const apiResponse = await apiResponsePromise;
    clearTimeout(timeoutId);
   
    const finalSpeech = ` ${apiResponse.data.choices[0].message.content}`;
    const index2 = Math.floor(Math.random() * 3);
    gptTurboMessage.push({role:apiResponse.data.choices[0].message.role, content: apiResponse.data.choices[0].message.content});
    return handlerInput.responseBuilder
      .speak(finalSpeech)
      .reprompt(other[index2])
      .getResponse();
}
catch (error){
    console.error(error);
    handlerInput.responseBuilder
      .speak('Something went wrong. I cannot connect to my base.');
}

  }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
 
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ExerciseRecommendationIntentHandler,
        WorkoutDurationIntentHandler,
        WorkoutTipIntentHandler,
        CreateWorkoutPlanIntentHandler,
        ExerciseDetailIntentHandler,
        TrackProgressIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        AskChatGPTIntentHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();