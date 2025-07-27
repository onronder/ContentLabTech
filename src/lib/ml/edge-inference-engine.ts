/**
 * Edge ML Inference Engine
 * Lightweight ML models optimized for edge deployment
 * Enables real-time predictions with minimal latency
 */

import { z } from "zod";

// Edge model schemas
const edgeModelSchema = z.object({
  modelId: z.string(),
  version: z.string(),
  type: z.enum([
    "content_classifier",
    "engagement_predictor",
    "sentiment_analyzer",
    "topic_extractor",
    "quality_scorer",
    "readability_analyzer",
  ]),
  weights: z.record(z.array(z.number())),
  biases: z.record(z.array(z.number())),
  metadata: z.object({
    inputFeatures: z.array(z.string()),
    outputClasses: z.array(z.string()).optional(),
    normalizationParams: z.record(
      z.object({
        mean: z.number(),
        std: z.number(),
      })
    ),
    accuracy: z.number(),
    modelSize: z.number(), // in KB
    lastUpdated: z.string().datetime(),
  }),
});

const inferenceRequestSchema = z.object({
  modelId: z.string(),
  features: z.record(z.union([z.number(), z.string(), z.array(z.number())])),
  options: z
    .object({
      threshold: z.number().min(0).max(1).optional(),
      topK: z.number().positive().optional(),
      includeConfidence: z.boolean().default(true),
    })
    .optional(),
});

const inferenceResultSchema = z.object({
  prediction: z.union([z.number(), z.string(), z.array(z.number())]),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.number()).optional(),
  features: z.record(z.number()).optional(),
  processingTime: z.number(),
  modelVersion: z.string(),
});

type EdgeModel = z.infer<typeof edgeModelSchema>;
type InferenceRequest = z.infer<typeof inferenceRequestSchema>;
type InferenceResult = z.infer<typeof inferenceResultSchema>;

interface ModelCache {
  model: EdgeModel;
  loadTime: number;
  lastUsed: number;
  useCount: number;
}

export class EdgeInferenceEngine {
  private modelCache = new Map<string, ModelCache>();
  private maxCacheSize = 10; // Maximum number of models to keep in memory
  private readonly modelDefinitions = new Map<string, any>();

  constructor() {
    this.initializeModels();
  }

  /**
   * Run inference on edge-optimized model
   */
  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const validatedRequest = inferenceRequestSchema.parse(request);
    const startTime = performance.now();

    // Load model if not cached
    const model = await this.loadModel(validatedRequest.modelId);

    // Prepare features
    const processedFeatures = this.preprocessFeatures(
      validatedRequest.features,
      model.metadata
    );

    // Run inference based on model type
    const result = await this.runInference(
      model,
      processedFeatures,
      validatedRequest.options
    );

    const processingTime = performance.now() - startTime;

    // Update cache statistics
    this.updateModelUsage(validatedRequest.modelId);

    return inferenceResultSchema.parse({
      ...result,
      processingTime,
      modelVersion: model.version,
    });
  }

  /**
   * Batch inference for multiple inputs
   */
  async batchInfer(
    modelId: string,
    inputs: Array<Record<string, any>>,
    options?: any
  ): Promise<InferenceResult[]> {
    const model = await this.loadModel(modelId);
    const startTime = performance.now();

    const results = await Promise.all(
      inputs.map(async features => {
        const processedFeatures = this.preprocessFeatures(
          features,
          model.metadata
        );
        return this.runInference(model, processedFeatures, options);
      })
    );

    const totalProcessingTime = performance.now() - startTime;

    return results.map(result =>
      inferenceResultSchema.parse({
        ...result,
        processingTime: totalProcessingTime / results.length,
        modelVersion: model.version,
      })
    );
  }

  /**
   * Initialize lightweight edge models
   */
  private initializeModels(): void {
    // Content Quality Scorer
    this.modelDefinitions.set("content_quality_scorer", {
      type: "quality_scorer",
      architecture: "linear_regression",
      features: [
        "word_count",
        "readability_score",
        "keyword_density",
        "heading_count",
        "image_count",
        "paragraph_count",
        "sentence_avg_length",
        "spelling_errors",
        "grammar_score",
      ],
      weights: [0.15, 0.25, 0.1, 0.1, 0.1, 0.1, 0.05, -0.1, 0.15],
      bias: 0.5,
      normalization: {
        word_count: { mean: 800, std: 400 },
        readability_score: { mean: 70, std: 15 },
        keyword_density: { mean: 2.5, std: 1.5 },
        heading_count: { mean: 4, std: 2 },
        image_count: { mean: 3, std: 2 },
        paragraph_count: { mean: 8, std: 4 },
        sentence_avg_length: { mean: 15, std: 5 },
        spelling_errors: { mean: 2, std: 3 },
        grammar_score: { mean: 85, std: 10 },
      },
    });

    // Engagement Predictor
    this.modelDefinitions.set("engagement_predictor", {
      type: "engagement_predictor",
      architecture: "neural_network",
      layers: [
        { type: "dense", units: 32, activation: "relu" },
        { type: "dropout", rate: 0.2 },
        { type: "dense", units: 16, activation: "relu" },
        { type: "dense", units: 1, activation: "sigmoid" },
      ],
      features: [
        "content_length",
        "title_sentiment",
        "publish_hour",
        "topic_relevance",
        "author_reputation",
        "historical_performance",
      ],
      weights: {
        layer1: this.generateRandomWeights(6, 32),
        layer2: this.generateRandomWeights(32, 16),
        layer3: this.generateRandomWeights(16, 1),
      },
      biases: {
        layer1: this.generateRandomWeights(1, 32)[0],
        layer2: this.generateRandomWeights(1, 16)[0],
        layer3: [0.1],
      },
    });

    // Topic Classifier
    this.modelDefinitions.set("topic_classifier", {
      type: "topic_extractor",
      architecture: "multinomial_naive_bayes",
      classes: [
        "technology",
        "business",
        "marketing",
        "design",
        "development",
        "data_science",
        "ai_ml",
        "productivity",
        "leadership",
        "innovation",
      ],
      vocabulary: this.generateMockVocabulary(),
      classPriors: {
        technology: 0.15,
        business: 0.12,
        marketing: 0.11,
        design: 0.1,
        development: 0.15,
        data_science: 0.08,
        ai_ml: 0.07,
        productivity: 0.09,
        leadership: 0.08,
        innovation: 0.05,
      },
    });

    // Sentiment Analyzer
    this.modelDefinitions.set("sentiment_analyzer", {
      type: "sentiment_analyzer",
      architecture: "logistic_regression",
      classes: ["negative", "neutral", "positive"],
      features: [
        "word_vectors",
        "punctuation_density",
        "caps_ratio",
        "exclamation_count",
      ],
      weights: {
        negative: [-0.5, -0.2, 0.3, 0.1],
        neutral: [0.1, 0.8, -0.1, -0.2],
        positive: [0.4, -0.6, -0.2, 0.1],
      },
      bias: [0.2, 0.6, 0.2],
    });

    // Readability Analyzer
    this.modelDefinitions.set("readability_analyzer", {
      type: "readability_analyzer",
      architecture: "decision_tree",
      features: [
        "avg_sentence_length",
        "syllable_density",
        "complex_word_ratio",
        "passive_voice_ratio",
      ],
      rules: [
        {
          condition: "avg_sentence_length <= 15 AND complex_word_ratio <= 0.1",
          score: 90,
          level: "very_easy",
        },
        {
          condition: "avg_sentence_length <= 20 AND complex_word_ratio <= 0.15",
          score: 80,
          level: "easy",
        },
        {
          condition: "avg_sentence_length <= 25 AND complex_word_ratio <= 0.20",
          score: 70,
          level: "moderate",
        },
        {
          condition: "avg_sentence_length <= 30 AND complex_word_ratio <= 0.25",
          score: 60,
          level: "difficult",
        },
      ],
      defaultScore: 50,
      defaultLevel: "very_difficult",
    });
  }

  /**
   * Load model into cache
   */
  private async loadModel(modelId: string): Promise<EdgeModel> {
    // Check cache first
    const cached = this.modelCache.get(modelId);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.model;
    }

    // Load model definition
    const definition = this.modelDefinitions.get(modelId);
    if (!definition) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Create edge model
    const model: EdgeModel = {
      modelId,
      version: "1.0.0",
      type: definition.type,
      weights: definition.weights || {},
      biases: definition.biases || {},
      metadata: {
        inputFeatures: definition.features || [],
        outputClasses: definition.classes,
        normalizationParams: definition.normalization || {},
        accuracy: 0.85, // Mock accuracy
        modelSize: this.calculateModelSize(definition),
        lastUpdated: new Date().toISOString(),
      },
    };

    // Add to cache
    this.addToCache(modelId, model);

    return model;
  }

  /**
   * Preprocess features for inference
   */
  private preprocessFeatures(
    features: Record<string, any>,
    metadata: EdgeModel["metadata"]
  ): number[] {
    const processedFeatures: number[] = [];

    for (const featureName of metadata.inputFeatures) {
      let value = features[featureName];

      // Handle missing features
      if (value === undefined || value === null) {
        value = 0;
      }

      // Convert to number if needed
      if (typeof value === "string") {
        value = parseFloat(value) || 0;
      }

      // Normalize if parameters available
      const normParams = metadata.normalizationParams[featureName];
      if (normParams) {
        value = (value - normParams.mean) / normParams.std;
      }

      processedFeatures.push(value);
    }

    return processedFeatures;
  }

  /**
   * Run inference based on model architecture
   */
  private async runInference(
    model: EdgeModel,
    features: number[],
    options?: any
  ): Promise<Partial<InferenceResult>> {
    const definition = this.modelDefinitions.get(model.modelId);
    if (!definition) {
      throw new Error(`Model definition not found: ${model.modelId}`);
    }

    switch (definition.architecture) {
      case "linear_regression":
        return this.runLinearRegression(definition, features);

      case "neural_network":
        return this.runNeuralNetwork(definition, features);

      case "multinomial_naive_bayes":
        return this.runNaiveBayes(definition, features, options);

      case "logistic_regression":
        return this.runLogisticRegression(definition, features);

      case "decision_tree":
        return this.runDecisionTree(definition, features);

      default:
        throw new Error(`Unsupported architecture: ${definition.architecture}`);
    }
  }

  /**
   * Linear regression inference
   */
  private runLinearRegression(
    definition: any,
    features: number[]
  ): Partial<InferenceResult> {
    let prediction = definition.bias;

    for (let i = 0; i < features.length && i < definition.weights.length; i++) {
      prediction += features[i] * definition.weights[i];
    }

    // Apply sigmoid to bound between 0 and 1
    prediction = 1 / (1 + Math.exp(-prediction));

    return {
      prediction,
      confidence: 0.8,
      features: features.reduce(
        (acc, val, idx) => {
          if (definition.features[idx]) {
            acc[definition.features[idx]] = val;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Neural network inference
   */
  private runNeuralNetwork(
    definition: any,
    features: number[]
  ): Partial<InferenceResult> {
    let activations = features;

    // Layer 1
    activations = this.denseLayer(
      activations,
      definition.weights.layer1,
      definition.biases.layer1
    );
    activations = activations.map(x => Math.max(0, x)); // ReLU

    // Dropout (skip in inference)

    // Layer 2
    activations = this.denseLayer(
      activations,
      definition.weights.layer2,
      definition.biases.layer2
    );
    activations = activations.map(x => Math.max(0, x)); // ReLU

    // Output layer
    activations = this.denseLayer(
      activations,
      definition.weights.layer3,
      definition.biases.layer3
    );
    const prediction = 1 / (1 + Math.exp(-activations[0])); // Sigmoid

    return {
      prediction,
      confidence: Math.abs(prediction - 0.5) * 2, // Distance from uncertain
    };
  }

  /**
   * Naive Bayes classifier inference
   */
  private runNaiveBayes(
    definition: any,
    features: number[],
    options?: any
  ): Partial<InferenceResult> {
    const classProbabilities: Record<string, number> = {};

    // Calculate probability for each class
    for (const className of definition.classes) {
      let logProb = Math.log(definition.classPriors[className]);

      // Add feature likelihoods (simplified)
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        // Mock likelihood calculation
        logProb += Math.log(Math.exp(-0.5 * feature * feature) + 0.001);
      }

      classProbabilities[className] = Math.exp(logProb);
    }

    // Normalize probabilities
    const total = Object.values(classProbabilities).reduce((a, b) => a + b, 0);
    for (const className in classProbabilities) {
      classProbabilities[className] /= total;
    }

    // Find prediction
    const prediction = Object.entries(classProbabilities).reduce(
      (max, [className, prob]) => (prob > max[1] ? [className, prob] : max)
    )[0];

    const confidence = classProbabilities[prediction];

    return {
      prediction,
      confidence,
      probabilities: classProbabilities,
    };
  }

  /**
   * Logistic regression inference
   */
  private runLogisticRegression(
    definition: any,
    features: number[]
  ): Partial<InferenceResult> {
    const classScores: Record<string, number> = {};

    // Calculate score for each class
    for (let i = 0; i < definition.classes.length; i++) {
      const className = definition.classes[i];
      let score = definition.bias[i];

      for (
        let j = 0;
        j < features.length && j < definition.weights[className].length;
        j++
      ) {
        score += features[j] * definition.weights[className][j];
      }

      classScores[className] = score;
    }

    // Apply softmax
    const maxScore = Math.max(...Object.values(classScores));
    const expScores: Record<string, number> = {};
    let sumExp = 0;

    for (const className in classScores) {
      expScores[className] = Math.exp(classScores[className] - maxScore);
      sumExp += expScores[className];
    }

    const probabilities: Record<string, number> = {};
    for (const className in expScores) {
      probabilities[className] = expScores[className] / sumExp;
    }

    // Find prediction
    const prediction = Object.entries(probabilities).reduce(
      (max, [className, prob]) => (prob > max[1] ? [className, prob] : max)
    )[0];

    return {
      prediction,
      confidence: probabilities[prediction],
      probabilities,
    };
  }

  /**
   * Decision tree inference
   */
  private runDecisionTree(
    definition: any,
    features: number[]
  ): Partial<InferenceResult> {
    // Map features to feature names
    const featureMap: Record<string, number> = {};
    definition.features.forEach((name: string, idx: number) => {
      featureMap[name] = features[idx] || 0;
    });

    // Evaluate rules
    for (const rule of definition.rules) {
      if (this.evaluateCondition(rule.condition, featureMap)) {
        return {
          prediction: rule.score,
          confidence: 0.9,
          features: { level: rule.level },
        };
      }
    }

    // Default case
    return {
      prediction: definition.defaultScore,
      confidence: 0.5,
      features: { level: definition.defaultLevel },
    };
  }

  /**
   * Dense layer computation
   */
  private denseLayer(
    inputs: number[],
    weights: number[][],
    biases: number[]
  ): number[] {
    const outputs: number[] = [];

    for (let i = 0; i < biases.length; i++) {
      let sum = biases[i];
      for (let j = 0; j < inputs.length; j++) {
        sum += inputs[j] * (weights[j]?.[i] || 0);
      }
      outputs.push(sum);
    }

    return outputs;
  }

  /**
   * Evaluate decision tree condition
   */
  private evaluateCondition(
    condition: string,
    features: Record<string, number>
  ): boolean {
    try {
      // Replace feature names with values
      let evalCondition = condition;
      for (const [name, value] of Object.entries(features)) {
        evalCondition = evalCondition.replace(
          new RegExp(name, "g"),
          value.toString()
        );
      }

      // Simple condition evaluation (in production, use a proper parser)
      return this.evaluateSimpleCondition(evalCondition);
    } catch {
      return false;
    }
  }

  /**
   * Simple condition evaluation
   */
  private evaluateSimpleCondition(condition: string): boolean {
    // Handle AND conditions
    if (condition.includes(" AND ")) {
      return condition
        .split(" AND ")
        .every(c => this.evaluateSimpleCondition(c.trim()));
    }

    // Handle OR conditions
    if (condition.includes(" OR ")) {
      return condition
        .split(" OR ")
        .some(c => this.evaluateSimpleCondition(c.trim()));
    }

    // Handle simple comparisons
    const operators = ["<=", ">=", "<", ">", "==", "!="];
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        const leftVal = parseFloat(left);
        const rightVal = parseFloat(right);

        switch (op) {
          case "<=":
            return leftVal <= rightVal;
          case ">=":
            return leftVal >= rightVal;
          case "<":
            return leftVal < rightVal;
          case ">":
            return leftVal > rightVal;
          case "==":
            return leftVal === rightVal;
          case "!=":
            return leftVal !== rightVal;
        }
      }
    }

    return false;
  }

  /**
   * Add model to cache with LRU eviction
   */
  private addToCache(modelId: string, model: EdgeModel): void {
    // Remove oldest if cache is full
    if (this.modelCache.size >= this.maxCacheSize) {
      const oldestEntry = Array.from(this.modelCache.entries()).sort(
        (a, b) => a[1].lastUsed - b[1].lastUsed
      )[0];
      this.modelCache.delete(oldestEntry[0]);
    }

    this.modelCache.set(modelId, {
      model,
      loadTime: Date.now(),
      lastUsed: Date.now(),
      useCount: 0,
    });
  }

  /**
   * Update model usage statistics
   */
  private updateModelUsage(modelId: string): void {
    const cached = this.modelCache.get(modelId);
    if (cached) {
      cached.useCount++;
      cached.lastUsed = Date.now();
    }
  }

  /**
   * Calculate model size in KB
   */
  private calculateModelSize(definition: any): number {
    let size = 0;

    // Count weights
    if (definition.weights) {
      if (Array.isArray(definition.weights)) {
        size += definition.weights.length * 4; // 4 bytes per float
      } else {
        for (const layer in definition.weights) {
          if (Array.isArray(definition.weights[layer])) {
            size += definition.weights[layer].flat().length * 4;
          }
        }
      }
    }

    // Count biases
    if (definition.biases) {
      for (const layer in definition.biases) {
        if (Array.isArray(definition.biases[layer])) {
          size += definition.biases[layer].length * 4;
        }
      }
    }

    // Add metadata overhead
    size += 1000; // 1KB for metadata

    return Math.round(size / 1024); // Convert to KB
  }

  /**
   * Generate random weights for neural network layers
   */
  private generateRandomWeights(
    inputSize: number,
    outputSize: number
  ): number[][] {
    const weights: number[][] = [];
    const scale = Math.sqrt(2.0 / inputSize); // He initialization

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }

    return weights;
  }

  /**
   * Generate mock vocabulary for text classification
   */
  private generateMockVocabulary(): Record<string, number> {
    const vocab: Record<string, number> = {};
    const words = [
      "technology",
      "innovation",
      "digital",
      "software",
      "development",
      "business",
      "strategy",
      "growth",
      "revenue",
      "market",
      "marketing",
      "campaign",
      "brand",
      "customer",
      "engagement",
      "design",
      "user",
      "interface",
      "experience",
      "creative",
      "data",
      "analytics",
      "insights",
      "metrics",
      "performance",
      "artificial",
      "intelligence",
      "machine",
      "learning",
      "algorithm",
      "productivity",
      "efficiency",
      "optimization",
      "workflow",
      "automation",
      "leadership",
      "management",
      "team",
      "collaboration",
      "communication",
    ];

    words.forEach((word, index) => {
      vocab[word] = index;
    });

    return vocab;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const stats = Array.from(this.modelCache.entries()).map(([id, cache]) => ({
      modelId: id,
      useCount: cache.useCount,
      lastUsed: new Date(cache.lastUsed),
      modelSize: cache.model.metadata.modelSize,
      loadTime: cache.loadTime,
    }));

    return {
      totalModels: this.modelCache.size,
      maxCacheSize: this.maxCacheSize,
      models: stats,
    };
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
  }

  /**
   * Get model info
   */
  getModelInfo(modelId: string): any {
    const definition = this.modelDefinitions.get(modelId);
    const cached = this.modelCache.get(modelId);

    return {
      modelId,
      available: !!definition,
      cached: !!cached,
      definition: definition
        ? {
            type: definition.type,
            architecture: definition.architecture,
            features: definition.features,
            classes: definition.classes,
          }
        : null,
      cache: cached
        ? {
            useCount: cached.useCount,
            lastUsed: new Date(cached.lastUsed),
            modelSize: cached.model.metadata.modelSize,
          }
        : null,
    };
  }

  /**
   * List available models
   */
  listModels(): string[] {
    return Array.from(this.modelDefinitions.keys());
  }
}

// Export singleton instance
export const edgeInferenceEngine = new EdgeInferenceEngine();
