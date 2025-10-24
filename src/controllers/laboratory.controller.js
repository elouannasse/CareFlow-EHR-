import Laboratory from "../models/Laboratory.js";
import LabOrder from "../models/LabOrder.js";
import Joi from "joi";

// Validation schema pour les laboratoires
const laboratoryValidationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  licenseNumber: Joi.string().trim().required(),
  labCode: Joi.string().trim().optional(),
  type: Joi.string()
    .valid(
      "Laboratoire général",
      "Laboratoire spécialisé",
      "Laboratoire hospitalier",
      "Laboratoire privé",
      "Centre de diagnostic",
      "Laboratoire de recherche"
    )
    .optional(),
  contact: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    phone: Joi.string().trim().required(),
    fax: Joi.string().trim().optional(),
    website: Joi.string().uri().trim().optional(),
  }).required(),
  address: Joi.object({
    street: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    zipCode: Joi.string().trim().required(),
    region: Joi.string().trim().optional(),
    country: Joi.string().trim().default("Maroc"),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).required(),
  specialties: Joi.array().items(Joi.string()).optional(),
  availableTests: Joi.array()
    .items(
      Joi.object({
        testCode: Joi.string().required(),
        testName: Joi.string().required(),
        category: Joi.string().optional(),
        price: Joi.number().min(0).optional(),
        duration: Joi.string().optional(),
        specimen: Joi.string().optional(),
      })
    )
    .optional(),
  director: Joi.object({
    name: Joi.string().trim().required(),
    licenseNumber: Joi.string().trim().required(),
    specialization: Joi.string().optional(),
    phone: Joi.string().trim().optional(),
    email: Joi.string().email().lowercase().trim().optional(),
  }).required(),
  services: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(500).trim().optional(),
});

export const createLaboratory = async (req, res) => {
  try {
    const { error, value } = laboratoryValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Vérifier l'unicité de l'email et du numéro de licence
    const existingLab = await Laboratory.findOne({
      $or: [
        { "contact.email": value.contact.email },
        { licenseNumber: value.licenseNumber },
      ],
    });

    if (existingLab) {
      return res.status(409).json({
        success: false,
        message:
          "Un laboratoire avec cet email ou numéro de licence existe déjà",
      });
    }

    const laboratory = new Laboratory(value);
    await laboratory.save();

    res.status(201).json({
      success: true,
      message: "Laboratoire créé avec succès",
      data: laboratory,
    });
  } catch (error) {
    console.error("Erreur lors de la création du laboratoire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création du laboratoire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllLaboratories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      specialty,
      type,
      status,
      isOpen,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { isActive: true };

    // Filtres
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { labCode: { $regex: search, $options: "i" } },
        { "director.name": { $regex: search, $options: "i" } },
      ];
    }

    if (city) {
      query["address.city"] = { $regex: city, $options: "i" };
    }

    if (specialty) {
      query.specialties = { $in: [specialty] };
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query["partnershipDetails.status"] = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    let laboratories = await Laboratory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Filtre pour laboratoires ouverts maintenant
    if (isOpen === "true") {
      laboratories = laboratories.filter((lab) => {
        const labInstance = new Laboratory(lab);
        return labInstance.isOpenNow();
      });
    }

    const totalLaboratories = await Laboratory.countDocuments(query);
    const totalPages = Math.ceil(totalLaboratories / parseInt(limit));

    res.status(200).json({
      success: true,
      data: laboratories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLaboratories,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des laboratoires:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des laboratoires",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLaboratoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const laboratory = await Laboratory.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    // Ajouter des statistiques
    const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
      LabOrder.countDocuments({ laboratory: id }),
      LabOrder.countDocuments({
        laboratory: id,
        status: { $in: ["pending", "ordered", "in_progress"] },
      }),
      LabOrder.countDocuments({ laboratory: id, status: "completed" }),
    ]);

    const laboratoryWithStats = {
      ...laboratory,
      statistics: {
        ...laboratory.statistics,
        totalOrders,
        pendingOrders,
        completedOrders,
      },
    };

    res.status(200).json({
      success: true,
      data: laboratoryWithStats,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du laboratoire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération du laboratoire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateLaboratory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = laboratoryValidationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Vérifier l'unicité (exclure le laboratoire actuel)
    const existingLab = await Laboratory.findOne({
      _id: { $ne: id },
      $or: [
        { "contact.email": value.contact.email },
        { licenseNumber: value.licenseNumber },
      ],
    });

    if (existingLab) {
      return res.status(409).json({
        success: false,
        message:
          "Un autre laboratoire avec cet email ou numéro de licence existe déjà",
      });
    }

    const laboratory = await Laboratory.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      message: "Laboratoire mis à jour avec succès",
      data: laboratory,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du laboratoire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour du laboratoire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const deleteLaboratory = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier s'il y a des ordres actifs
    const activeOrders = await LabOrder.countDocuments({
      laboratory: id,
      status: {
        $in: ["pending", "ordered", "sample_collected", "in_progress"],
      },
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Impossible de supprimer: ce laboratoire a des ordres en cours",
        activeOrders,
      });
    }

    const laboratory = await Laboratory.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      message: "Laboratoire supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du laboratoire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression du laboratoire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const addTestToLaboratory = async (req, res) => {
  try {
    const { id } = req.params;
    const { testCode, testName, category, price, duration, specimen } =
      req.body;

    const laboratory = await Laboratory.findOne({ _id: id, isActive: true });
    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    // Vérifier si le test existe déjà
    const existingTest = laboratory.availableTests.find(
      (test) => test.testCode === testCode
    );
    if (existingTest) {
      return res.status(409).json({
        success: false,
        message: "Ce test existe déjà dans ce laboratoire",
      });
    }

    laboratory.availableTests.push({
      testCode,
      testName,
      category,
      price,
      duration,
      specimen,
    });

    await laboratory.save();

    res.status(201).json({
      success: true,
      message: "Test ajouté au laboratoire avec succès",
      data: laboratory.availableTests[laboratory.availableTests.length - 1],
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du test:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'ajout du test",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const removeTestFromLaboratory = async (req, res) => {
  try {
    const { id, testCode } = req.params;

    const laboratory = await Laboratory.findOne({ _id: id, isActive: true });
    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    const testIndex = laboratory.availableTests.findIndex(
      (test) => test.testCode === testCode
    );
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Test non trouvé dans ce laboratoire",
      });
    }

    laboratory.availableTests[testIndex].isActive = false;
    await laboratory.save();

    res.status(200).json({
      success: true,
      message: "Test retiré du laboratoire avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du retrait du test:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors du retrait du test",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateTestInLaboratory = async (req, res) => {
  try {
    const { id, testCode } = req.params;
    const { testName, category, price, duration, specimen } = req.body;

    const laboratory = await Laboratory.findOne({ _id: id, isActive: true });
    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    const testIndex = laboratory.availableTests.findIndex(
      (test) => test.testCode === testCode
    );
    if (testIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Test non trouvé dans ce laboratoire",
      });
    }

    // Mettre à jour le test
    if (testName) laboratory.availableTests[testIndex].testName = testName;
    if (category) laboratory.availableTests[testIndex].category = category;
    if (price !== undefined) laboratory.availableTests[testIndex].price = price;
    if (duration) laboratory.availableTests[testIndex].duration = duration;
    if (specimen) laboratory.availableTests[testIndex].specimen = specimen;

    await laboratory.save();

    res.status(200).json({
      success: true,
      message: "Test mis à jour avec succès",
      data: laboratory.availableTests[testIndex],
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du test:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour du test",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLabOrdersByLaboratory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const laboratory = await Laboratory.findOne({
      _id: id,
      isActive: true,
    });

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { laboratory: id, isActive: true };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const orders = await LabOrder.find(query)
      .populate("patient", "firstName lastName phone")
      .populate("prescribedBy", "firstName lastName specialization")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await LabOrder.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.status(200).json({
      success: true,
      data: orders,
      laboratory: {
        id: laboratory._id,
        name: laboratory.name,
        labCode: laboratory.labCode,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des ordres du laboratoire:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des ordres",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLaboratoryStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = "month", startDate, endDate } = req.query;

    const laboratory = await Laboratory.findOne({
      _id: id,
      isActive: true,
    });

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    // Définir la période
    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      switch (period) {
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { createdAt: { $gte: weekAgo } };
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = { createdAt: { $gte: monthAgo } };
          break;
        case "year":
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter = { createdAt: { $gte: yearAgo } };
          break;
      }
    }

    const baseQuery = { laboratory: id, ...dateFilter };

    // Statistiques générales
    const [
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      urgentOrders,
    ] = await Promise.all([
      LabOrder.countDocuments(baseQuery),
      LabOrder.countDocuments({ ...baseQuery, status: "pending" }),
      LabOrder.countDocuments({
        ...baseQuery,
        status: { $in: ["assigned", "sample_collected", "in_progress"] },
      }),
      LabOrder.countDocuments({ ...baseQuery, status: "completed" }),
      LabOrder.countDocuments({ ...baseQuery, status: "cancelled" }),
      LabOrder.countDocuments({ ...baseQuery, urgencyLevel: "urgent" }),
    ]);

    // Statistiques par test
    const testStats = await LabOrder.aggregate([
      { $match: baseQuery },
      { $unwind: "$tests" },
      {
        $group: {
          _id: "$tests.testCode",
          testName: { $first: "$tests.testName" },
          category: { $first: "$tests.category" },
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ["$tests.result.status", "completed"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Calcul des temps moyens
    const avgProcessingTime = await LabOrder.aggregate([
      {
        $match: {
          ...baseQuery,
          status: "completed",
          completedAt: { $exists: true },
        },
      },
      {
        $addFields: {
          processingTime: {
            $subtract: ["$completedAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$processingTime" },
        },
      },
    ]);

    const statistics = {
      laboratory: {
        id: laboratory._id,
        name: laboratory.name,
        labCode: laboratory.labCode,
      },
      period: {
        type: period,
        startDate: dateFilter.createdAt?.$gte || null,
        endDate: dateFilter.createdAt?.$lte || now,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        urgent: urgentOrders,
        completionRate:
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      tests: {
        mostRequested: testStats,
        totalTestsPerformed: testStats.reduce(
          (sum, test) => sum + test.count,
          0
        ),
      },
      performance: {
        avgProcessingTimeHours:
          avgProcessingTime.length > 0
            ? Math.round(
                (avgProcessingTime[0].avgTime / (1000 * 60 * 60)) * 100
              ) / 100
            : 0,
      },
    };

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors du calcul des statistiques",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const searchLaboratoriesByTests = async (req, res) => {
  try {
    const { tests, city, partnersOnly, page = 1, limit = 10 } = req.query;

    if (!tests) {
      return res.status(400).json({
        success: false,
        message: "Les codes de tests sont requis pour la recherche",
      });
    }

    const testCodes = tests.split(",").map((code) => code.trim());
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isActive: true,
      "availableTests.testCode": { $in: testCodes },
      "availableTests.isActive": true,
    };

    if (city) {
      query["address.city"] = { $regex: city, $options: "i" };
    }

    if (partnersOnly === "true") {
      query["partnershipDetails.isPartner"] = true;
      query["partnershipDetails.status"] = "active";
    }

    const laboratories = await Laboratory.find(query)
      .select({
        name: 1,
        labCode: 1,
        address: 1,
        contact: 1,
        availableTests: {
          $elemMatch: { testCode: { $in: testCodes }, isActive: true },
        },
        partnershipDetails: 1,
      })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculer les tests disponibles pour chaque laboratoire
    const laboratoriesWithMatchingTests = laboratories.map((lab) => {
      const matchingTests = lab.availableTests.filter((test) =>
        testCodes.includes(test.testCode)
      );

      return {
        ...lab.toObject(),
        matchingTests,
        matchingTestsCount: matchingTests.length,
        totalRequestedTests: testCodes.length,
        matchPercentage: (matchingTests.length / testCodes.length) * 100,
      };
    });

    // Trier par pourcentage de correspondance
    laboratoriesWithMatchingTests.sort(
      (a, b) => b.matchPercentage - a.matchPercentage
    );

    const totalLaboratories = await Laboratory.countDocuments(query);
    const totalPages = Math.ceil(totalLaboratories / parseInt(limit));

    res.status(200).json({
      success: true,
      data: laboratoriesWithMatchingTests,
      searchCriteria: {
        requestedTests: testCodes,
        city: city || null,
        partnersOnly: partnersOnly === "true",
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLaboratories,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la recherche des laboratoires:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la recherche des laboratoires",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLaboratoryAvailableTests = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, search } = req.query;

    const laboratory = await Laboratory.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé",
      });
    }

    let tests = laboratory.availableTests.filter((test) => test.isActive);

    // Filtres
    if (category) {
      tests = tests.filter((test) => test.category === category);
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      tests = tests.filter(
        (test) =>
          searchRegex.test(test.testName) || searchRegex.test(test.testCode)
      );
    }

    // Grouper par catégorie
    const testsByCategory = tests.reduce((acc, test) => {
      const cat = test.category || "Autres";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(test);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        laboratory: {
          id: laboratory._id,
          name: laboratory.name,
          labCode: laboratory.labCode,
        },
        testsByCategory,
        totalTests: tests.length,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tests:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des tests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
