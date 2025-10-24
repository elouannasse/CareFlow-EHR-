import LabOrder from "../models/LabOrder.js";
import Laboratory from "../models/Laboratory.js";
import Joi from "joi";


const labOrderValidationSchema = Joi.object({
  patient: Joi.string().required(),
  doctor: Joi.string().required(),
  consultation: Joi.string().optional(),
  laboratory: Joi.string().optional(),
  tests: Joi.array()
    .items(
      Joi.object({
        testCode: Joi.string().required(),
        testName: Joi.string().required(),
        category: Joi.string()
          .valid(
            "Hématologie",
            "Biochimie",
            "Immunologie",
            "Microbiologie",
            "Parasitologie",
            "Hormonologie",
            "Toxicologie",
            "Génétique",
            "Anatomie pathologique",
            "Cytologie",
            "Sérologie",
            "Allergie",
            "Coagulation",
            "Urinaire",
            "Cardiaque",
            "Hépatique",
            "Rénal",
            "Lipidique",
            "Diabète",
            "Thyroïde",
            "Autre"
          )
          .required(),
        specimen: Joi.object({
          type: Joi.string()
            .valid(
              "Sang",
              "Urine",
              "Selles",
              "Salive",
              "Expectoration",
              "LCR",
              "Liquide pleural",
              "Liquide ascite",
              "Biopsie",
              "Frottis",
              "Autre"
            )
            .required(),
          container: Joi.string().optional(),
          volume: Joi.string().optional(),
          collectionInstructions: Joi.string().optional(),
        }).required(),
        urgency: Joi.string()
          .valid("Normal", "Urgent", "STAT", "Programmé")
          .optional(),
        fastingRequired: Joi.boolean().optional(),
        specialInstructions: Joi.string().optional(),
        estimatedDuration: Joi.string().optional(),
        price: Joi.number().min(0).optional(),
      })
    )
    .min(1)
    .required(),
  priority: Joi.string()
    .valid("Low", "Normal", "High", "Urgent", "STAT")
    .optional(),
  clinicalInfo: Joi.object({
    symptoms: Joi.array().items(Joi.string()).optional(),
    diagnosis: Joi.string().optional(),
    medications: Joi.array().items(Joi.string()).optional(),
    allergies: Joi.array().items(Joi.string()).optional(),
    relevantHistory: Joi.string().optional(),
  }).optional(),
  appointmentDate: Joi.date().optional(),
  notes: Joi.string().max(1000).optional(),
});

export const createLabOrder = async (req, res) => {
  try {
    const { error, value } = labOrderValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    // Vérification du laboratoire si spécifié
    if (value.laboratory) {
      const laboratory = await Laboratory.findOne({
        _id: value.laboratory,
        isActive: true,
        "partnershipDetails.status": "active",
      });

      if (!laboratory) {
        return res.status(404).json({
          success: false,
          message: "Laboratoire non trouvé ou inactif",
        });
      }

      // Vérifier que le laboratoire peut effectuer tous les tests demandés
      const unavailableTests = value.tests.filter(
        (test) => !laboratory.getAvailableTest(test.testCode)
      );

      if (unavailableTests.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Certains tests ne sont pas disponibles dans ce laboratoire",
          unavailableTests: unavailableTests.map((test) => test.testCode),
        });
      }
    }

    const labOrder = new LabOrder(value);

    // Calculer la date de rapport estimée
    labOrder.calculateEstimatedReportDate();

    await labOrder.save();

    // Mettre à jour les statistiques du laboratoire
    if (value.laboratory) {
      const laboratory = await Laboratory.findById(value.laboratory);
      if (laboratory) {
        laboratory.updateStatistics(1);
        await laboratory.save();
      }
    }

    // Populer les données pour la réponse
    const populatedOrder = await LabOrder.findById(labOrder._id)
      .populate("patient", "firstName lastName phone email dateOfBirth")
      .populate("doctor", "firstName lastName specialization")
      .populate("consultation", "date diagnosis")
      .populate("laboratory", "name labCode contact address");

    res.status(201).json({
      success: true,
      message: "Ordre de laboratoire créé avec succès",
      data: populatedOrder,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la création de l'ordre de laboratoire:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création de l'ordre",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllLabOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      laboratory,
      patient,
      doctor,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { isActive: true };

    // Filtres
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (laboratory) query.laboratory = laboratory;
    if (patient) query.patient = patient;
    if (doctor) query.doctor = doctor;

    // Filtre par date
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Recherche textuelle
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "tests.testName": { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const labOrders = await LabOrder.find(query)
      .populate("patient", "firstName lastName phone")
      .populate("doctor", "firstName lastName specialization")
      .populate("laboratory", "name labCode")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await LabOrder.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.status(200).json({
      success: true,
      data: labOrders,
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
    console.error("Erreur lors de la récupération des ordres:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des ordres",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLabOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const labOrder = await LabOrder.findOne({ _id: id, isActive: true })
      .populate("patient", "firstName lastName phone email dateOfBirth gender")
      .populate("doctor", "firstName lastName specialization phone email")
      .populate("consultation", "date diagnosis symptoms")
      .populate("laboratory", "name labCode contact address operatingHours")
      .populate("tests.result.reportedBy", "firstName lastName");

    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: "Ordre de laboratoire non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: labOrder,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'ordre:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération de l'ordre",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateLabOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, labNotes } = req.body;

    const validStatuses = [
      "pending",
      "ordered",
      "sample_collected",
      "in_progress",
      "partially_completed",
      "completed",
      "reported",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide",
        validStatuses,
      });
    }

    const labOrder = await LabOrder.findOne({ _id: id, isActive: true });
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: "Ordre de laboratoire non trouvé",
      });
    }

    // Vérifications de logique métier
    if (labOrder.status === "cancelled" || labOrder.status === "reported") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier un ordre annulé ou rapporté",
      });
    }

    labOrder.status = status;
    if (labNotes) labOrder.labNotes = labNotes;

    await labOrder.save();

    // Populer les données pour la réponse
    const updatedOrder = await LabOrder.findById(id)
      .populate("patient", "firstName lastName")
      .populate("doctor", "firstName lastName")
      .populate("laboratory", "name");

    res.status(200).json({
      success: true,
      message: "Statut mis à jour avec succès",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateTestResult = async (req, res) => {
  try {
    const { orderId, testIndex } = req.params;
    const { value, unit, referenceRange, interpretation, comments } = req.body;

    const labOrder = await LabOrder.findOne({ _id: orderId, isActive: true });
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: "Ordre de laboratoire non trouvé",
      });
    }

    if (testIndex >= labOrder.tests.length) {
      return res.status(400).json({
        success: false,
        message: "Index de test invalide",
      });
    }

    // Mettre à jour le résultat du test
    const test = labOrder.tests[testIndex];
    test.result = {
      value,
      unit,
      referenceRange,
      interpretation,
      comments,
      reportedAt: new Date(),
      reportedBy: req.user.id,
    };
    test.status = "completed";
    test.completedAt = new Date();

    // Mettre à jour le statut global de l'ordre
    labOrder.updateOverallStatus();

    await labOrder.save();

    res.status(200).json({
      success: true,
      message: "Résultat du test mis à jour avec succès",
      data: {
        test: labOrder.tests[testIndex],
        overallStatus: labOrder.status,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du résultat:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour du résultat",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const assignToLaboratory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { laboratoryId } = req.body;

    const [labOrder, laboratory] = await Promise.all([
      LabOrder.findOne({ _id: orderId, isActive: true }),
      Laboratory.findOne({
        _id: laboratoryId,
        isActive: true,
        "partnershipDetails.status": "active",
      }),
    ]);

    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: "Ordre de laboratoire non trouvé",
      });
    }

    if (!laboratory) {
      return res.status(404).json({
        success: false,
        message: "Laboratoire non trouvé ou inactif",
      });
    }

    // Vérifier que le laboratoire peut effectuer tous les tests
    const unavailableTests = labOrder.tests.filter(
      (test) => !laboratory.getAvailableTest(test.testCode)
    );

    if (unavailableTests.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Le laboratoire ne peut pas effectuer tous les tests demandés",
        unavailableTests: unavailableTests.map((test) => test.testCode),
      });
    }

    labOrder.laboratory = laboratoryId;
    labOrder.status = "ordered";
    labOrder.calculateEstimatedReportDate();

    await labOrder.save();

    // Mettre à jour les statistiques du laboratoire
    laboratory.updateStatistics(1);
    await laboratory.save();

    const updatedOrder = await LabOrder.findById(orderId)
      .populate("laboratory", "name labCode contact")
      .populate("patient", "firstName lastName")
      .populate("doctor", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Ordre assigné au laboratoire avec succès",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation au laboratoire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'assignation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const cancelLabOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const labOrder = await LabOrder.findOne({ _id: id, isActive: true });
    if (!labOrder) {
      return res.status(404).json({
        success: false,
        message: "Ordre de laboratoire non trouvé",
      });
    }

    if (!labOrder.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: "Cet ordre ne peut pas être annulé",
        currentStatus: labOrder.status,
      });
    }

    labOrder.status = "cancelled";
    if (reason) labOrder.notes = (labOrder.notes || "") + `\nAnnulé: ${reason}`;

    await labOrder.save();

    res.status(200).json({
      success: true,
      message: "Ordre annulé avec succès",
      data: labOrder,
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de l'ordre:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'annulation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLabOrdersByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 10 } = req.query;

    const query = { patient: patientId, isActive: true };
    if (status) query.status = status;

    const labOrders = await LabOrder.find(query)
      .populate("doctor", "firstName lastName specialization")
      .populate("laboratory", "name labCode")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: labOrders,
      totalOrders: labOrders.length,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des ordres du patient:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getLabOrderStatistics = async (req, res) => {
  try {
    const { laboratoryId } = req.params;
    const { period = "month" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "week":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "month":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        };
        break;
      case "year":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), 0, 1),
          },
        };
        break;
    }

    const matchQuery = { isActive: true, ...dateFilter };
    if (laboratoryId) matchQuery.laboratory = laboratoryId;

    const [statusStats, priorityStats, testCategoryStats] = await Promise.all([
      LabOrder.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      LabOrder.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      LabOrder.aggregate([
        { $match: matchQuery },
        { $unwind: "$tests" },
        { $group: { _id: "$tests.category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
        topTestCategories: testCategoryStats,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
