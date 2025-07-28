/**
 * Federated Learning System
 * Enables collaborative machine learning across multiple projects/clients
 * while preserving privacy and data locality
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";
import { EventEmitter } from "events";

// Federated learning schemas
const federatedModelSchema = z.object({
  modelId: z.string(),
  version: z.number(),
  algorithm: z.enum([
    "federated_averaging",
    "federated_sgd",
    "federated_prox",
    "secure_aggregation",
  ]),
  globalWeights: z.record(z.array(z.number())),
  globalBiases: z.record(z.array(z.number())),
  metadata: z.object({
    participants: z.number(),
    totalRounds: z.number(),
    convergenceMetric: z.number(),
    privacy: z.object({
      differentialPrivacy: z.boolean(),
      epsilon: z.number().positive().optional(),
      delta: z.number().positive().optional(),
      noiseMultiplier: z.number().positive().optional(),
    }),
    performance: z.object({
      accuracy: z.number(),
      loss: z.number(),
      f1Score: z.number().optional(),
    }),
    lastUpdate: z.string().datetime(),
  }),
});

const clientUpdateSchema = z.object({
  clientId: z.string(),
  modelId: z.string(),
  round: z.number(),
  localWeights: z.record(z.array(z.number())),
  localBiases: z.record(z.array(z.number())),
  trainingMetrics: z.object({
    localLoss: z.number(),
    localAccuracy: z.number(),
    samplesUsed: z.number(),
    epochs: z.number(),
    trainingTime: z.number(),
  }),
  privacyMetrics: z.object({
    noiseAdded: z.boolean(),
    noiseMagnitude: z.number().optional(),
  }),
  timestamp: z.string().datetime(),
});

const federatedConfigSchema = z.object({
  modelType: z.enum([
    "content_classifier",
    "engagement_predictor",
    "quality_scorer",
    "personalization_model",
  ]),
  aggregationAlgorithm: z.enum([
    "federated_averaging",
    "weighted_averaging",
    "momentum_aggregation",
    "adaptive_aggregation",
  ]),
  clientSelection: z.object({
    strategy: z.enum([
      "random",
      "round_robin",
      "performance_based",
      "data_size_based",
    ]),
    participantsPerRound: z.number().positive(),
    minParticipants: z.number().positive(),
  }),
  privacy: z.object({
    enableDifferentialPrivacy: z.boolean(),
    epsilon: z.number().positive().default(1.0),
    delta: z.number().positive().default(1e-5),
    enableSecureAggregation: z.boolean(),
    gradientClipping: z.number().positive().default(1.0),
  }),
  convergence: z.object({
    maxRounds: z.number().positive(),
    targetAccuracy: z.number().min(0).max(1).optional(),
    toleranceRounds: z.number().positive().default(5),
    minImprovement: z.number().positive().default(0.001),
  }),
  communication: z.object({
    compressionEnabled: z.boolean().default(true),
    quantizationBits: z.number().min(1).max(32).default(8),
    sparsificationThreshold: z.number().min(0).max(1).default(0.01),
  }),
});

type FederatedModel = z.infer<typeof federatedModelSchema>;
type ClientUpdate = z.infer<typeof clientUpdateSchema>;
type FederatedConfig = z.infer<typeof federatedConfigSchema>;

interface ClientInfo {
  clientId: string;
  projectId: string;
  dataSize: number;
  lastSeen: Date;
  performance: {
    accuracy: number;
    reliability: number;
    avgTrainingTime: number;
  };
  capabilities: {
    computePower: "low" | "medium" | "high";
    bandwidth: "low" | "medium" | "high";
    availability: number; // 0-1
  };
}

export class FederatedLearningSystem extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private activeModels = new Map<string, FederatedModel>();
  private clientRegistry = new Map<string, ClientInfo>();
  private trainingRounds = new Map<string, any>();
  private aggregationQueue = new Map<string, ClientUpdate[]>();

  constructor() {
    super();
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);

    this.initializeFederatedSystem();
  }

  /**
   * Initialize a new federated learning session
   */
  async initiateFederatedTraining(
    modelId: string,
    config: FederatedConfig
  ): Promise<{ sessionId: string; initialModel: any }> {
    const validatedConfig = federatedConfigSchema.parse(config);
    const sessionId = `fed_${modelId}_${Date.now()}`;

    // Initialize global model
    const initialModel = await this.initializeGlobalModel(
      modelId,
      validatedConfig.modelType
    );

    // Store federated configuration
    await this.supabase.from("federated_sessions").insert({
      session_id: sessionId,
      model_id: modelId,
      config: validatedConfig,
      status: "initializing",
      global_model: initialModel,
      current_round: 0,
      created_at: new Date().toISOString(),
    });

    // Register active model
    this.activeModels.set(sessionId, {
      modelId,
      version: 1,
      algorithm: validatedConfig.aggregationAlgorithm as
        | "federated_averaging"
        | "federated_sgd"
        | "federated_prox"
        | "secure_aggregation",
      globalWeights: initialModel.weights,
      globalBiases: initialModel.biases,
      metadata: {
        participants: 0,
        totalRounds: 0,
        convergenceMetric: 0,
        privacy: {
          differentialPrivacy:
            validatedConfig.privacy.enableDifferentialPrivacy,
          epsilon: validatedConfig.privacy.epsilon,
          delta: validatedConfig.privacy.delta,
          noiseMultiplier: validatedConfig.privacy.gradientClipping,
        },
        performance: {
          accuracy: 0,
          loss: 1.0,
          f1Score: 0,
        },
        lastUpdate: new Date().toISOString(),
      },
    });

    // Select initial clients
    const selectedClients = await this.selectClients(
      validatedConfig.clientSelection,
      validatedConfig.modelType
    );

    // Send initial model to selected clients
    await this.broadcastModelToClients(
      sessionId,
      initialModel,
      selectedClients
    );

    this.emit("training:initiated", {
      sessionId,
      modelId,
      clientCount: selectedClients.length,
    });

    return { sessionId, initialModel };
  }

  /**
   * Register a client for federated learning
   */
  async registerClient(
    clientId: string,
    projectId: string,
    capabilities: ClientInfo["capabilities"],
    dataSize: number
  ): Promise<void> {
    const clientInfo: ClientInfo = {
      clientId,
      projectId,
      dataSize,
      lastSeen: new Date(),
      performance: {
        accuracy: 0.5,
        reliability: 1.0,
        avgTrainingTime: 300, // seconds
      },
      capabilities,
    };

    this.clientRegistry.set(clientId, clientInfo);

    // Store in database
    await this.supabase.from("federated_clients").upsert({
      client_id: clientId,
      project_id: projectId,
      capabilities,
      data_size: dataSize,
      performance_metrics: clientInfo.performance,
      last_seen: new Date().toISOString(),
    });

    this.emit("client:registered", { clientId, projectId });
  }

  /**
   * Submit local model update from client
   */
  async submitLocalUpdate(
    sessionId: string,
    update: ClientUpdate
  ): Promise<{ accepted: boolean; nextRound?: number }> {
    const validatedUpdate = clientUpdateSchema.parse(update);

    // Validate session
    const model = this.activeModels.get(sessionId);
    if (!model) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Apply privacy mechanisms
    const sanitizedUpdate = await this.applyPrivacyMechanisms(
      validatedUpdate,
      model
    );

    // Add to aggregation queue
    if (!this.aggregationQueue.has(sessionId)) {
      this.aggregationQueue.set(sessionId, []);
    }
    this.aggregationQueue.get(sessionId)!.push(sanitizedUpdate);

    // Store update
    await this.supabase.from("federated_updates").insert({
      session_id: sessionId,
      client_id: validatedUpdate.clientId,
      round: validatedUpdate.round,
      local_weights: validatedUpdate.localWeights,
      local_biases: validatedUpdate.localBiases,
      training_metrics: validatedUpdate.trainingMetrics,
      privacy_metrics: validatedUpdate.privacyMetrics,
      created_at: new Date().toISOString(),
    });

    // Update client performance
    await this.updateClientPerformance(
      validatedUpdate.clientId,
      validatedUpdate.trainingMetrics
    );

    this.emit("update:received", {
      sessionId,
      clientId: validatedUpdate.clientId,
    });

    // Check if ready for aggregation
    const readyForAggregation = await this.checkAggregationReadiness(sessionId);
    if (readyForAggregation) {
      const nextRound = await this.performAggregation(sessionId);
      return { accepted: true, nextRound };
    }

    return { accepted: true };
  }

  /**
   * Perform model aggregation
   */
  private async performAggregation(sessionId: string): Promise<number> {
    const model = this.activeModels.get(sessionId);
    const updates = this.aggregationQueue.get(sessionId) || [];

    if (!model || updates.length === 0) {
      throw new Error("Cannot perform aggregation");
    }

    // Get session config
    const { data: session } = await this.supabase
      .from("federated_sessions")
      .select("config, current_round")
      .eq("session_id", sessionId)
      .single();

    const config = session?.config as FederatedConfig;
    const currentRound = session?.current_round || 0;

    // Perform aggregation based on algorithm
    const aggregatedModel = await this.aggregateUpdates(
      model,
      updates,
      config.aggregationAlgorithm
    );

    // Update global model
    this.activeModels.set(sessionId, aggregatedModel);

    // Calculate performance metrics
    const performanceMetrics = await this.calculateGlobalPerformance(updates);

    // Update session
    await this.supabase
      .from("federated_sessions")
      .update({
        global_model: {
          weights: aggregatedModel.globalWeights,
          biases: aggregatedModel.globalBiases,
        },
        current_round: (currentRound as number) + 1,
        performance_metrics: performanceMetrics,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    // Clear aggregation queue
    this.aggregationQueue.set(sessionId, []);

    // Check convergence
    const hasConverged = await this.checkConvergence(
      sessionId,
      performanceMetrics,
      config
    );

    if (hasConverged) {
      await this.finalizeTraining(sessionId);
      return -1; // Signal completion
    }

    // Select clients for next round
    const nextClients = await this.selectClients(
      config.clientSelection,
      config.modelType
    );

    // Broadcast updated model
    await this.broadcastModelToClients(sessionId, aggregatedModel, nextClients);

    this.emit("aggregation:completed", {
      sessionId,
      round: (currentRound as number) + 1,
      performance: performanceMetrics,
    });

    return (currentRound as number) + 1;
  }

  /**
   * Initialize global model architecture
   */
  private async initializeGlobalModel(
    modelId: string,
    modelType: string
  ): Promise<any> {
    const architectures = {
      content_classifier: {
        layers: ["input", "hidden1", "hidden2", "output"],
        dimensions: { input: 100, hidden1: 64, hidden2: 32, output: 10 },
        activation: "relu",
      },
      engagement_predictor: {
        layers: ["input", "hidden1", "output"],
        dimensions: { input: 50, hidden1: 32, output: 1 },
        activation: "sigmoid",
      },
      quality_scorer: {
        layers: ["input", "hidden1", "output"],
        dimensions: { input: 20, hidden1: 16, output: 1 },
        activation: "linear",
      },
      personalization_model: {
        layers: ["input", "embedding", "hidden1", "output"],
        dimensions: { input: 200, embedding: 64, hidden1: 32, output: 10 },
        activation: "relu",
      },
    };

    const architecture = architectures[modelType as keyof typeof architectures];
    if (!architecture) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    // Initialize weights and biases
    const weights: Record<string, number[][]> = {};
    const biases: Record<string, number[]> = {};

    const layers = architecture.layers;
    for (let i = 0; i < layers.length - 1; i++) {
      const layerName = `${layers[i]}_to_${layers[i + 1]}`;
      const inputDim =
        architecture.dimensions[
          layers[i] as keyof typeof architecture.dimensions
        ];
      const outputDim =
        architecture.dimensions[
          layers[i + 1] as keyof typeof architecture.dimensions
        ];

      // Xavier initialization
      const scale = Math.sqrt(2.0 / (inputDim + outputDim));
      weights[layerName] = this.initializeWeights(inputDim, outputDim, scale);
      biases[layerName] = this.initializeBiases(outputDim);
    }

    return {
      modelId,
      architecture,
      weights,
      biases,
      version: 1,
    };
  }

  /**
   * Select clients for training round
   */
  private async selectClients(
    selection: FederatedConfig["clientSelection"],
    modelType: string
  ): Promise<string[]> {
    const availableClients = Array.from(this.clientRegistry.values()).filter(
      client => this.isClientEligible(client, modelType)
    );

    if (availableClients.length < selection.minParticipants) {
      throw new Error(
        `Insufficient clients available: ${availableClients.length} < ${selection.minParticipants}`
      );
    }

    let selectedClients: ClientInfo[] = [];

    switch (selection.strategy) {
      case "random":
        selectedClients = this.randomSample(
          availableClients,
          selection.participantsPerRound
        );
        break;

      case "performance_based":
        selectedClients = availableClients
          .sort((a, b) => b.performance.accuracy - a.performance.accuracy)
          .slice(0, selection.participantsPerRound);
        break;

      case "data_size_based":
        selectedClients = availableClients
          .sort((a, b) => b.dataSize - a.dataSize)
          .slice(0, selection.participantsPerRound);
        break;

      case "round_robin":
        // Simple round-robin implementation
        selectedClients = this.roundRobinSelection(
          availableClients,
          selection.participantsPerRound
        );
        break;
    }

    return selectedClients.map(client => client.clientId);
  }

  /**
   * Apply privacy mechanisms to client updates
   */
  private async applyPrivacyMechanisms(
    update: ClientUpdate,
    model: FederatedModel
  ): Promise<ClientUpdate> {
    const privacy = model.metadata.privacy;

    if (!privacy.differentialPrivacy) {
      return update;
    }

    // Apply differential privacy noise
    const noisyWeights: Record<string, number[]> = {};
    const noisyBiases: Record<string, number[]> = {};

    const sensitivity = privacy.noiseMultiplier || 1.0;
    const noiseScale = sensitivity / (privacy.epsilon || 1.0);

    // Add Gaussian noise to weights
    for (const [layer, weights] of Object.entries(update.localWeights)) {
      noisyWeights[layer] = weights.map(
        w => w + this.gaussianNoise(0, noiseScale)
      );
    }

    // Add Gaussian noise to biases
    for (const [layer, biases] of Object.entries(update.localBiases)) {
      noisyBiases[layer] = biases.map(
        b => b + this.gaussianNoise(0, noiseScale)
      );
    }

    return {
      ...update,
      localWeights: noisyWeights,
      localBiases: noisyBiases,
      privacyMetrics: {
        noiseAdded: true,
        noiseMagnitude: noiseScale,
      },
    };
  }

  /**
   * Aggregate client updates using specified algorithm
   */
  private async aggregateUpdates(
    globalModel: FederatedModel,
    updates: ClientUpdate[],
    algorithm: string
  ): Promise<FederatedModel> {
    switch (algorithm) {
      case "federated_averaging":
        return this.federatedAveraging(globalModel, updates);

      case "weighted_averaging":
        return this.weightedAveraging(globalModel, updates);

      case "momentum_aggregation":
        return this.momentumAggregation(globalModel, updates);

      case "adaptive_aggregation":
        return this.adaptiveAggregation(globalModel, updates);

      default:
        throw new Error(`Unknown aggregation algorithm: ${algorithm}`);
    }
  }

  /**
   * Federated averaging aggregation
   */
  private federatedAveraging(
    globalModel: FederatedModel,
    updates: ClientUpdate[]
  ): FederatedModel {
    const numClients = updates.length;
    const aggregatedWeights: Record<string, number[]> = {};
    const aggregatedBiases: Record<string, number[]> = {};

    // Initialize with zeros
    for (const layer in globalModel.globalWeights) {
      aggregatedWeights[layer] = new Array(
        globalModel.globalWeights[layer]?.length || 0
      ).fill(0);
    }
    for (const layer in globalModel.globalBiases) {
      aggregatedBiases[layer] = new Array(
        globalModel.globalBiases[layer]?.length || 0
      ).fill(0);
    }

    // Sum all client updates
    for (const update of updates) {
      for (const layer in update.localWeights) {
        for (let i = 0; i < (update.localWeights[layer]?.length || 0); i++) {
          if (aggregatedWeights[layer]) {
            aggregatedWeights[layer][i] += update.localWeights[layer]![i] || 0;
          }
        }
      }
      for (const layer in update.localBiases) {
        for (let i = 0; i < update.localBiases[layer].length; i++) {
          aggregatedBiases[layer][i] += update.localBiases[layer][i];
        }
      }
    }

    // Average
    for (const layer in aggregatedWeights) {
      for (let i = 0; i < aggregatedWeights[layer].length; i++) {
        aggregatedWeights[layer][i] /= numClients;
      }
    }
    for (const layer in aggregatedBiases) {
      for (let i = 0; i < aggregatedBiases[layer].length; i++) {
        aggregatedBiases[layer][i] /= numClients;
      }
    }

    return {
      ...globalModel,
      globalWeights: aggregatedWeights,
      globalBiases: aggregatedBiases,
      version: globalModel.version + 1,
      metadata: {
        ...globalModel.metadata,
        participants: numClients,
        totalRounds: globalModel.metadata.totalRounds + 1,
        lastUpdate: new Date().toISOString(),
      },
    };
  }

  /**
   * Weighted averaging based on data size
   */
  private weightedAveraging(
    globalModel: FederatedModel,
    updates: ClientUpdate[]
  ): FederatedModel {
    const totalSamples = updates.reduce(
      (sum, update) => sum + update.trainingMetrics.samplesUsed,
      0
    );
    const aggregatedWeights: Record<string, number[]> = {};
    const aggregatedBiases: Record<string, number[]> = {};

    // Initialize with zeros
    for (const layer in globalModel.globalWeights) {
      aggregatedWeights[layer] = new Array(
        globalModel.globalWeights[layer]?.length || 0
      ).fill(0);
    }
    for (const layer in globalModel.globalBiases) {
      aggregatedBiases[layer] = new Array(
        globalModel.globalBiases[layer]?.length || 0
      ).fill(0);
    }

    // Weighted sum
    for (const update of updates) {
      const weight = update.trainingMetrics.samplesUsed / totalSamples;

      for (const layer in update.localWeights) {
        for (let i = 0; i < (update.localWeights[layer]?.length || 0); i++) {
          aggregatedWeights[layer][i] += update.localWeights[layer][i] * weight;
        }
      }
      for (const layer in update.localBiases) {
        for (let i = 0; i < update.localBiases[layer].length; i++) {
          aggregatedBiases[layer][i] += update.localBiases[layer][i] * weight;
        }
      }
    }

    return {
      ...globalModel,
      globalWeights: aggregatedWeights,
      globalBiases: aggregatedBiases,
      version: globalModel.version + 1,
      metadata: {
        ...globalModel.metadata,
        participants: updates.length,
        totalRounds: globalModel.metadata.totalRounds + 1,
        lastUpdate: new Date().toISOString(),
      },
    };
  }

  /**
   * Momentum-based aggregation
   */
  private momentumAggregation(
    globalModel: FederatedModel,
    updates: ClientUpdate[]
  ): FederatedModel {
    const momentum = 0.9;

    // First apply federated averaging
    const averaged = this.federatedAveraging(globalModel, updates);

    // Apply momentum (simplified - would need momentum state in practice)
    const momentumWeights: Record<string, number[]> = {};
    const momentumBiases: Record<string, number[]> = {};

    for (const layer in averaged.globalWeights) {
      momentumWeights[layer] = averaged.globalWeights[layer].map(
        (w, i) =>
          momentum * globalModel.globalWeights[layer][i] + (1 - momentum) * w
      );
    }
    for (const layer in averaged.globalBiases) {
      momentumBiases[layer] = averaged.globalBiases[layer].map(
        (b, i) =>
          momentum * globalModel.globalBiases[layer][i] + (1 - momentum) * b
      );
    }

    return {
      ...averaged,
      globalWeights: momentumWeights,
      globalBiases: momentumBiases,
    };
  }

  /**
   * Adaptive aggregation based on client performance
   */
  private adaptiveAggregation(
    globalModel: FederatedModel,
    updates: ClientUpdate[]
  ): FederatedModel {
    // Weight updates by client accuracy
    const totalWeight = updates.reduce(
      (sum, update) => sum + update.trainingMetrics.localAccuracy,
      0
    );
    const aggregatedWeights: Record<string, number[]> = {};
    const aggregatedBiases: Record<string, number[]> = {};

    // Initialize with zeros
    for (const layer in globalModel.globalWeights) {
      aggregatedWeights[layer] = new Array(
        globalModel.globalWeights[layer]?.length || 0
      ).fill(0);
    }
    for (const layer in globalModel.globalBiases) {
      aggregatedBiases[layer] = new Array(
        globalModel.globalBiases[layer]?.length || 0
      ).fill(0);
    }

    // Adaptive weighted sum
    for (const update of updates) {
      const weight = update.trainingMetrics.localAccuracy / totalWeight;

      for (const layer in update.localWeights) {
        for (let i = 0; i < (update.localWeights[layer]?.length || 0); i++) {
          aggregatedWeights[layer][i] += update.localWeights[layer][i] * weight;
        }
      }
      for (const layer in update.localBiases) {
        for (let i = 0; i < update.localBiases[layer].length; i++) {
          aggregatedBiases[layer][i] += update.localBiases[layer][i] * weight;
        }
      }
    }

    return {
      ...globalModel,
      globalWeights: aggregatedWeights,
      globalBiases: aggregatedBiases,
      version: globalModel.version + 1,
      metadata: {
        ...globalModel.metadata,
        participants: updates.length,
        totalRounds: globalModel.metadata.totalRounds + 1,
        lastUpdate: new Date().toISOString(),
      },
    };
  }

  // Helper methods
  private initializeWeights(
    inputDim: number,
    outputDim: number,
    scale: number
  ): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < inputDim; i++) {
      weights[i] = [];
      for (let j = 0; j < outputDim; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    return weights;
  }

  private initializeBiases(outputDim: number): number[] {
    return new Array(outputDim).fill(0);
  }

  private gaussianNoise(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private randomSample<T>(array: T[], count: number): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result.slice(0, count);
  }

  private roundRobinSelection(
    clients: ClientInfo[],
    count: number
  ): ClientInfo[] {
    // Simple round-robin - in practice would maintain round-robin state
    return clients.slice(0, count);
  }

  private isClientEligible(client: ClientInfo, modelType: string): boolean {
    const now = Date.now();
    const lastSeenMs = client.lastSeen.getTime();
    const timeSinceLastSeen = now - lastSeenMs;

    // Client must have been seen within last hour
    if (timeSinceLastSeen > 3600000) return false;

    // Client must have minimum data size
    if (client.dataSize < 100) return false;

    // Client must have reasonable availability
    if (client.capabilities.availability < 0.5) return false;

    return true;
  }

  private async calculateGlobalPerformance(
    updates: ClientUpdate[]
  ): Promise<any> {
    const avgAccuracy =
      updates.reduce((sum, u) => sum + u.trainingMetrics.localAccuracy, 0) /
      updates.length;
    const avgLoss =
      updates.reduce((sum, u) => sum + u.trainingMetrics.localLoss, 0) /
      updates.length;

    return {
      accuracy: avgAccuracy,
      loss: avgLoss,
      participantCount: updates.length,
    };
  }

  private async checkAggregationReadiness(sessionId: string): Promise<boolean> {
    const updates = this.aggregationQueue.get(sessionId) || [];

    // Get session config
    const { data: session } = await this.supabase
      .from("federated_sessions")
      .select("config")
      .eq("session_id", sessionId)
      .single();

    if (!session) return false;

    const config = session.config as FederatedConfig;
    return updates.length >= config.clientSelection.minParticipants;
  }

  private async checkConvergence(
    sessionId: string,
    performance: any,
    config: FederatedConfig
  ): Promise<boolean> {
    const model = this.activeModels.get(sessionId);
    if (!model) return false;

    // Check max rounds
    if (model.metadata.totalRounds >= config.convergence.maxRounds) {
      return true;
    }

    // Check target accuracy
    if (
      config.convergence.targetAccuracy &&
      performance.accuracy >= config.convergence.targetAccuracy
    ) {
      return true;
    }

    // Check improvement (simplified)
    const previousAccuracy = model.metadata.performance.accuracy;
    const improvement = performance.accuracy - previousAccuracy;

    if (improvement < config.convergence.minImprovement) {
      // Check tolerance rounds (would need to track in practice)
      return true;
    }

    return false;
  }

  private async finalizeTraining(sessionId: string): Promise<void> {
    const model = this.activeModels.get(sessionId);
    if (!model) return;

    await this.supabase
      .from("federated_sessions")
      .update({
        status: "completed",
        final_model: {
          weights: model.globalWeights,
          biases: model.globalBiases,
          performance: model.metadata.performance,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    this.activeModels.delete(sessionId);
    this.aggregationQueue.delete(sessionId);

    this.emit("training:completed", { sessionId, finalModel: model });
  }

  private async broadcastModelToClients(
    sessionId: string,
    model: any,
    clientIds: string[]
  ): Promise<void> {
    // In practice, this would use a message queue or direct API calls
    this.emit("model:broadcast", { sessionId, model, clientIds });
  }

  private async updateClientPerformance(
    clientId: string,
    metrics: ClientUpdate["trainingMetrics"]
  ): Promise<void> {
    const client = this.clientRegistry.get(clientId);
    if (client) {
      client.performance.accuracy = metrics.localAccuracy;
      client.performance.avgTrainingTime = metrics.trainingTime;
      client.lastSeen = new Date();
    }
  }

  private async initializeFederatedSystem(): Promise<void> {
    // Load existing sessions
    const { data: sessions } = await this.supabase
      .from("federated_sessions")
      .select("*")
      .eq("status", "active");

    // Load registered clients
    const { data: clients } = await this.supabase
      .from("federated_clients")
      .select("*");

    if (clients) {
      for (const client of clients) {
        this.clientRegistry.set(client.client_id, {
          clientId: client.client_id,
          projectId: client.project_id,
          dataSize: client.data_size,
          lastSeen: new Date(client.last_seen),
          performance: client.performance_metrics,
          capabilities: client.capabilities,
        });
      }
    }

    console.log("Federated learning system initialized");
  }

  /**
   * Get federated learning analytics
   */
  async getFederatedAnalytics(timeframe = 30): Promise<any> {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    const { data: sessions } = await this.supabase
      .from("federated_sessions")
      .select(
        `
        *,
        federated_updates (
          client_id,
          training_metrics,
          created_at
        )
      `
      )
      .gte("created_at", startDate.toISOString());

    if (!sessions) return {};

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === "active").length,
      completedSessions: sessions.filter(s => s.status === "completed").length,
      totalClients: this.clientRegistry.size,
      activeClients: Array.from(this.clientRegistry.values()).filter(
        c => Date.now() - c.lastSeen.getTime() < 3600000
      ).length,
      avgAccuracy:
        sessions.reduce(
          (sum, s) => sum + (s.performance_metrics?.accuracy || 0),
          0
        ) / sessions.length,
    };
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): any {
    const model = this.activeModels.get(sessionId);
    const updates = this.aggregationQueue.get(sessionId) || [];

    return {
      sessionId,
      active: !!model,
      currentRound: model?.metadata.totalRounds || 0,
      participants: model?.metadata.participants || 0,
      pendingUpdates: updates.length,
      performance: model?.metadata.performance,
    };
  }
}

// Export singleton instance
export const federatedLearningSystem = new FederatedLearningSystem();
