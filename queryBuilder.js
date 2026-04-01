exports.buildQuery = (filters = {}) => {
  const query = {};
  
  if (filters.branch) query.branch = filters.branch;
  if (filters.status !== undefined) query.status = filters.status;
  if (filters.search) {
    query.$or = filters.searchFields?.map(field => ({
      [field]: { $regex: filters.search, $options: 'i' }
    })) || [];
  }
  if (filters.dateRange) {
    query.createdAt = {
      $gte: new Date(filters.dateRange.start),
      $lte: new Date(filters.dateRange.end)
    };
  }
  if (filters.customFilters) {
    Object.assign(query, filters.customFilters);
  }
  
  return query;
};

exports.buildSort = (sortBy = 'createdAt', order = -1) => {
  return { [sortBy]: order };
};

exports.getPagination = (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

exports.buildAggregation = (stage) => {
  return stage;
};

exports.selectFields = (fields = []) => {
  if (fields.length === 0) return '';
  return fields.join(' ');
};

exports.optimizedFind = async (Model, query, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    select = '',
    populate = null,
    lean = true
  } = options;

  const { skip } = exports.getPagination(page, limit);

  let queryBuilder = Model.find(query);
  
  if (select) queryBuilder = queryBuilder.select(select);
  if (populate) queryBuilder = queryBuilder.populate(populate);
  if (sort) queryBuilder = queryBuilder.sort(sort);
  if (lean) queryBuilder = queryBuilder.lean();

  const [data, total] = await Promise.all([
    queryBuilder.skip(skip).limit(parseInt(limit)),
    Model.countDocuments(query)
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit)
  };
};

exports.optimizedAggregate = async (Model, pipeline, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const { skip } = exports.getPagination(page, limit);

  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline = [...pipeline, { $skip: skip }, { $limit: parseInt(limit) }];

  const [countResult, data] = await Promise.all([
    Model.aggregate(countPipeline),
    Model.aggregate(dataPipeline)
  ]);

  const total = countResult[0]?.total || 0;

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit)
  };
};
